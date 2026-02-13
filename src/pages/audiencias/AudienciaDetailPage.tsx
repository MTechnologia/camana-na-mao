import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Users, Clock, Building2, User, Loader2, FileText, Bell, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/ui/page-header";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { tituloParaExibicao, limparDescricaoRepetida } from "@/lib/audienciaDisplay";

interface Audiencia {
  id: string;
  titulo: string;
  descricao: string | null;
  data: string;
  hora: string;
  local: string;
  tema: string;
  status: string;
  vagas_disponiveis: number | null;
  inscricoes_abertas: boolean | null;
  link_transmissao: string | null;
}

const themeColors: Record<string, string> = {
  "Mobilidade": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Educação": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Saúde": "bg-red-500/10 text-red-600 border-red-500/20",
  "Meio Ambiente": "bg-green-500/10 text-green-600 border-green-500/20",
  "Cultura": "bg-pink-500/10 text-pink-600 border-pink-500/20",
  "Segurança": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "Habitação": "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const AudienciaDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [audiencia, setAudiencia] = useState<Audiencia | null>(null);
  const [loading, setLoading] = useState(true);
  const [lembreteInscrito, setLembreteInscrito] = useState(false);
  const [lembreteLoading, setLembreteLoading] = useState(false);

  useEffect(() => {
    const fetchAudiencia = async () => {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('audiencias')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (!error && data) {
        setAudiencia(data);
      }
      setLoading(false);
    };

    fetchAudiencia();
  }, [id]);

  useEffect(() => {
    if (!user?.id || !id) return;
    const check = async () => {
      const { data } = await supabase
        .from('audiencia_inscricoes')
        .select('id')
        .eq('user_id', user.id)
        .eq('audiencia_id', id)
        .maybeSingle();
      setLembreteInscrito(!!data);
    };
    check();
  }, [user?.id, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Carregando..." backTo="/audiencias" />
        <div className="pt-[60px] p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!audiencia) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Audiência não encontrada" backTo="/audiencias" />
        <div className="pt-[60px] p-6 text-center">
          <p className="text-muted-foreground mb-4">A audiência solicitada não foi encontrada.</p>
          <Button onClick={() => navigate("/audiencias")}>Voltar para audiências</Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5);
  };

  const handleReceberLembretes = async () => {
    if (!user?.id || !id) {
      toast.error("Faça login para receber lembretes.");
      navigate("/login", { state: { from: `/audiencias/${id}` } });
      return;
    }
    setLembreteLoading(true);
    const { error } = await supabase
      .from("audiencia_inscricoes")
      .insert({ user_id: user.id, audiencia_id: id, status: "confirmada" });
    setLembreteLoading(false);
    if (error) {
      if (error.code === "23505") {
        setLembreteInscrito(true);
        toast.info("Você já está inscrito para lembretes desta audiência.");
      } else {
        toast.error("Não foi possível inscrever. Tente novamente.");
      }
      return;
    }
    setLembreteInscrito(true);
    toast.success("Inscrito! Você receberá lembretes desta audiência no celular e e-mail.");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Detalhes da Audiência" backTo="/audiencias" />
      
      <div className="pt-[60px] p-6 space-y-6">
        {/* Header com título e badge */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-foreground leading-tight">{tituloParaExibicao(audiencia.titulo, audiencia.descricao, audiencia.tema)}</h1>
            <Badge
              variant="outline"
              className={`border shrink-0 ${themeColors[audiencia.tema] || "bg-gray-500/10 text-gray-600 border-gray-500/20"}`}
            >
              {audiencia.tema}
            </Badge>
          </div>
          <p className="text-base text-muted-foreground mt-3">
            {limparDescricaoRepetida(audiencia.descricao) || `Audiência pública sobre ${audiencia.tema}. Participe e contribua com sua opinião sobre este tema relevante para a cidade.`}
          </p>
        </div>

        <Separator />

        {/* Informações principais */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Data</p>
              <p className="text-sm text-muted-foreground capitalize">
                {formatDate(audiencia.data)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Horário</p>
              <p className="text-sm text-muted-foreground">{formatTime(audiencia.hora)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Local</p>
              <p className="text-sm text-muted-foreground">{audiencia.local}</p>
            </div>
          </div>

          {audiencia.vagas_disponiveis && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Vagas Disponíveis</p>
                <p className="text-sm text-muted-foreground">
                  {audiencia.vagas_disponiveis} vagas
                </p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Como participar */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Como participar
          </h4>
          <p className="text-sm text-muted-foreground">
            As audiências públicas são abertas a todos os cidadãos. Ao se inscrever você receberá:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• Link de acesso à audiência</li>
            <li>• Materiais de apoio</li>
            <li>• Lembrete do evento</li>
          </ul>
        </div>

        {/* Observações legais */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Fonte:</strong> Portal da Câmara Municipal de São Paulo
          </p>
          <p>
            <strong>Atualizado:</strong> Hoje às 10:30 (verificação a cada 15 minutos)
          </p>
          <p>
            <strong>Privacidade:</strong> Seus dados são protegidos conforme LGPD
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4">
          {/* Receber lembretes (sempre visível para usuário logado; convite ao login se não estiver) */}
          {lembreteInscrito ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm text-foreground">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
              <span>Você receberá lembretes desta audiência no celular e e-mail.</span>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-primary text-primary hover:bg-primary/10"
              onClick={handleReceberLembretes}
              disabled={lembreteLoading}
            >
              {lembreteLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              {user ? "Receber lembretes desta audiência" : "Receber lembretes (faça login)"}
            </Button>
          )}

          <Button variant="outline" onClick={() => navigate("/audiencias")} className="w-full">
            Voltar
          </Button>
          {audiencia.inscricoes_abertas ? (
            <>
              <Button
                onClick={() => navigate(`/audiencias/${id}/participar?tipo=videoconferencia`)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <User className="h-4 w-4 mr-2" />
                Inscrição para manifestar-se durante a videoconferência
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/audiencias/${id}/participar?tipo=escrito`)}
                className="w-full border-primary text-primary hover:bg-primary/10"
              >
                <FileText className="h-4 w-4 mr-2" />
                Enviar manifestação por escrito para a audiência
              </Button>
            </>
          ) : (
            <Button disabled className="w-full">
              <User className="h-4 w-4 mr-2" />
              Inscrições fechadas
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudienciaDetailPage;
