import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import ProfilePageHeader from "@/components/profile/ProfilePageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Shield,
  CheckCircle,
  XCircle,
  Info,
  FileText,
  MapPin,
  Users,
  Mail,
  Eye,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type ConsentType =
  | "terms_of_use"
  | "privacy_policy"
  | "data_collection"
  | "location_tracking"
  | "demographic_data"
  | "newsletter"
  | "council_sharing";

interface ConsentInfo {
  type: ConsentType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  required: boolean;
}

const CONSENT_TYPES: ConsentInfo[] = [
  {
    type: "terms_of_use",
    label: "Termos de Uso",
    description: "Aceite dos termos e condições de uso da plataforma",
    icon: FileText,
    required: true,
  },
  {
    type: "privacy_policy",
    label: "Política de Privacidade",
    description: "Aceite da política de privacidade e tratamento de dados",
    icon: Shield,
    required: true,
  },
  {
    type: "data_collection",
    label: "Coleta de Dados",
    description: "Autorização para coleta e processamento de seus dados pessoais",
    icon: Eye,
    required: false,
  },
  {
    type: "location_tracking",
    label: "Rastreamento de Localização",
    description: "Permissão para usar sua localização para serviços próximos",
    icon: MapPin,
    required: false,
  },
  {
    type: "demographic_data",
    label: "Dados Demográficos",
    description: "Autorização para coletar e usar dados demográficos (opcional)",
    icon: Users,
    required: false,
  },
  {
    type: "newsletter",
    label: "Newsletter",
    description: "Receber notícias e atualizações por email",
    icon: Mail,
    required: false,
  },
  {
    type: "council_sharing",
    label: "Compartilhamento com Vereadores",
    description: "Permitir compartilhamento de relatos com vereadores e comissões",
    icon: Users,
    required: false,
  },
];

interface ConsentRecord {
  id: string;
  consent_type: ConsentType;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  version: string | null;
}

const ConsentsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [consents, setConsents] = useState<Record<ConsentType, ConsentRecord | null>>({
    terms_of_use: null,
    privacy_policy: null,
    data_collection: null,
    location_tracking: null,
    demographic_data: null,
    newsletter: null,
    council_sharing: null,
  });

  useEffect(() => {
    if (user) {
      loadConsents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadConsents runs when user changes
  }, [user]);

  const loadConsents = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_consents")
        .select("*")
        .eq("user_id", user.id)
        .order("granted_at", { ascending: false });

      if (error) throw error;

      // Organizar por tipo
      const consentsMap: Record<ConsentType, ConsentRecord | null> = {
        terms_of_use: null,
        privacy_policy: null,
        data_collection: null,
        location_tracking: null,
        demographic_data: null,
        newsletter: null,
        council_sharing: null,
      };

      data?.forEach((consent) => {
        const type = consent.consent_type as ConsentType;
        // Pegar o mais recente se houver múltiplos
        if (
          !consentsMap[type] ||
          (consent.granted_at &&
            (!consentsMap[type]?.granted_at ||
              new Date(consent.granted_at) > new Date(consentsMap[type]!.granted_at!)))
        ) {
          consentsMap[type] = consent;
        }
      });

      setConsents(consentsMap);
    } catch (error: unknown) {
      console.error("Error loading consents:", error);
      toast.error("Erro ao carregar consentimentos");
    }
  };

  const handleToggleConsent = async (type: ConsentType, currentValue: boolean) => {
    if (!user) return;

    const consentInfo = CONSENT_TYPES.find((c) => c.type === type);
    if (!consentInfo) return;

    // Não permitir revogar consentimentos obrigatórios
    if (consentInfo.required && currentValue) {
      toast.error(`${consentInfo.label} é obrigatório e não pode ser revogado`);
      return;
    }

    setLoading(true);
    try {
      if (currentValue) {
        // Revogar
        const { error } = await supabase.rpc("revoke_consent", {
          _user_id: user.id,
          _consent_type: type,
        });

        if (error) throw error;
        toast.success(`${consentInfo.label} revogado com sucesso`);
      } else {
        // Conceder
        const { error } = await supabase.rpc("grant_consent", {
          _user_id: user.id,
          _consent_type: type,
          _version: "1.0",
        });

        if (error) throw error;
        toast.success(`${consentInfo.label} concedido com sucesso`);
      }

      // Recarregar consentimentos
      await loadConsents();
    } catch (error: unknown) {
      console.error("Error toggling consent:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar consentimento");
    } finally {
      setLoading(false);
    }
  };

  const getConsentStatus = (type: ConsentType) => {
    const consent = consents[type];
    if (!consent) return { granted: false, date: null };

    return {
      granted: consent.granted && !consent.revoked_at,
      date: consent.granted_at,
      revokedDate: consent.revoked_at,
    };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader title="Consentimentos" backTo="/perfil" />

      <div className="p-4 space-y-4">
        <ProfilePageHeader subtitle="Gestão de consentimentos LGPD" />

        {/* Informação sobre consentimentos */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-foreground font-medium">Seus direitos LGPD</p>
                <p className="text-xs text-muted-foreground">
                  Você pode gerenciar seus consentimentos a qualquer momento. Consentimentos
                  obrigatórios (Termos de Uso e Política de Privacidade) não podem ser revogados,
                  pois são necessários para uso da plataforma.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-primary"
                  onClick={() => navigate("/privacidade")}
                >
                  Ver Política de Privacidade completa →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Consentimentos */}
        <div className="space-y-3">
          {CONSENT_TYPES.map((consentInfo) => {
            const Icon = consentInfo.icon;
            const status = getConsentStatus(consentInfo.type);
            const isGranted = status.granted;

            return (
              <Card key={consentInfo.type} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isGranted ? "bg-green-100" : "bg-muted"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              isGranted ? "text-green-600" : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-semibold text-foreground">
                              {consentInfo.label}
                            </Label>
                            {consentInfo.required && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                Obrigatório
                              </span>
                            )}
                            {isGranted ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {consentInfo.description}
                          </p>
                          {status.date && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {isGranted
                                  ? `Concedido em ${formatDate(status.date)}`
                                  : `Revogado em ${formatDate(status.revokedDate)}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Switch
                        checked={isGranted}
                        onCheckedChange={(checked) =>
                          handleToggleConsent(consentInfo.type, !checked)
                        }
                        disabled={loading || (consentInfo.required && isGranted)}
                        className="data-[state=checked]:bg-green-600"
                      />
                      {consentInfo.required && isGranted && (
                        <span className="text-xs text-muted-foreground text-right">
                          Obrigatório
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Aviso sobre revogação */}
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  Importante sobre revogação
                </p>
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  Ao revogar um consentimento, algumas funcionalidades podem ficar indisponíveis. A
                  revogação não afeta tratamentos já realizados com base no consentimento anterior.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão voltar */}
        <div className="pt-4">
          <Button variant="outline" onClick={() => navigate("/perfil")} className="w-full">
            Voltar ao Perfil
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConsentsPage;
