import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import ProfilePageHeader from "@/components/profile/ProfilePageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Download,
  FileJson,
  Loader2,
  CheckCircle,
  Info,
  Shield,
  Database,
  FileText,
  Calendar,
  AlertCircle,
} from "lucide-react";

const DataExportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exported, setExported] = useState(false);

  const handleExport = async () => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    setLoading(true);
    try {
      // Get session token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Token de autenticação não encontrado");
      }

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke("export-user-data", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        throw error;
      }

      // Create blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dados-pessoais-${user.id}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExported(true);
      toast.success("Dados exportados com sucesso!");
    } catch (error: unknown) {
      console.error("Error exporting data:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao exportar dados. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const dataCategories = [
    {
      icon: Database,
      title: "Dados da Conta",
      description: "Email, telefone, data de criação",
    },
    {
      icon: FileText,
      title: "Perfil",
      description: "Nome, foto, biografia",
    },
    {
      icon: Calendar,
      title: "Dados Demográficos",
      description: "Idade, gênero, raça, classe social",
    },
    {
      icon: Database,
      title: "Endereços",
      description: "Todos os endereços cadastrados",
    },
    {
      icon: FileText,
      title: "Relatos",
      description: "Relatos urbanos e de transporte",
    },
    {
      icon: FileText,
      title: "Avaliações",
      description: "Avaliações de serviços públicos",
    },
    {
      icon: Database,
      title: "Consentimentos",
      description: "Histórico de consentimentos LGPD",
    },
    {
      icon: Database,
      title: "Preferências",
      description: "Configurações de privacidade e notificações",
    },
  ];

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader title="Exportar Dados" backTo="/perfil" />

      <div className="p-4 space-y-4">
        <ProfilePageHeader subtitle="Portabilidade de dados (LGPD)" />

        {/* Informação sobre exportação */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-foreground font-medium">Seu direito à portabilidade</p>
                <p className="text-xs text-muted-foreground">
                  Você tem o direito de receber seus dados pessoais em formato estruturado e
                  interoperável. Os dados serão exportados em formato JSON, que pode ser facilmente
                  lido e importado em outros sistemas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categorias de dados */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Dados incluídos na exportação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dataCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                    <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{category.title}</p>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Aviso sobre privacidade */}
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  Proteja seus dados
                </p>
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  O arquivo exportado contém informações pessoais sensíveis. Mantenha-o seguro e não
                  compartilhe com terceiros não autorizados.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão de exportação */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              {exported ? (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Exportação concluída!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Seus dados foram exportados e o download deve ter iniciado automaticamente.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Download className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Exportar meus dados
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Clique no botão abaixo para baixar todos os seus dados pessoais em formato
                      JSON. O processo pode levar alguns segundos.
                    </p>
                  </div>
                </>
              )}

              <Button
                onClick={handleExport}
                disabled={loading || exported}
                className="w-full max-w-sm h-12 gap-2"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : exported ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Exportação concluída
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Exportar dados (JSON)
                  </>
                )}
              </Button>

              {!exported && (
                <p className="text-xs text-muted-foreground">
                  Formato: JSON • Tamanho aproximado: 50-500 KB
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informações adicionais */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">Segurança</p>
                  <p className="text-xs text-muted-foreground">
                    Os dados são exportados apenas para você. Nenhum dado é compartilhado com
                    terceiros durante o processo de exportação.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileJson className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">Formato JSON</p>
                  <p className="text-xs text-muted-foreground">
                    O arquivo JSON pode ser aberto em qualquer editor de texto ou visualizador JSON.
                    É um formato padrão e interoperável.
                  </p>
                </div>
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

export default DataExportPage;
