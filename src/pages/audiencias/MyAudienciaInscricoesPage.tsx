import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Bell, Video, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AudienciaRef {
  id: string;
  titulo: string;
  data: string;
  status?: string;
}

interface InscricaoLembrete {
  id: string;
  created_at: string;
  audiencia: AudienciaRef | null;
}

interface Participacao {
  id: string;
  tipo: string;
  created_at: string;
  audiencia: AudienciaRef | null;
}

export default function MyAudienciaInscricoesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lembretes, setLembretes] = useState<InscricaoLembrete[]>([]);
  const [participacoes, setParticipacoes] = useState<Participacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      const [resInsc, resPart] = await Promise.all([
        supabase
          .from("audiencia_inscricoes")
          .select("id, created_at, audiencia:audiencias(id, titulo, data, status)")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("audiencia_participacoes")
          .select("id, tipo, created_at, audiencia:audiencias(id, titulo, data, status)")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (!cancelled) {
        setLembretes((resInsc.data ?? []) as InscricaoLembrete[]);
        setParticipacoes((resPart.data ?? []) as Participacao[]);
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const formatData = (dateStr: string) => {
    try {
      const d = dateStr.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split("-").map(Number);
        return format(new Date(y, m - 1, day), "d MMM yyyy", { locale: ptBR });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const tipoLabel = (tipo: string) =>
    tipo === "videoconferencia" ? "Videoconferência" : tipo === "escrito" ? "Manifestação escrita" : tipo;

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Minhas inscrições em audiências" backTo="/relatos" />
        <div className="pt-[60px] p-6 text-center">
          <p className="text-muted-foreground mb-4">Faça login para ver suas inscrições e participações em audiências públicas.</p>
          <Button onClick={() => navigate("/login", { state: { from: "/audiencias/minhas-inscricoes" } })}>
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Minhas inscrições em audiências" backTo="/relatos" />
      <div className="pt-[60px] p-6 max-w-2xl mx-auto space-y-6">
        <p className="text-sm text-muted-foreground">
          Registro das suas inscrições para lembretes e das suas participações (videoconferência ou manifestação escrita) em audiências públicas.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Participações (videoconferência/escrito) — o que o usuário mais quer confirmar */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                <Video className="h-5 w-5" />
                Participações (videoconferência / escrito)
              </h2>
              {participacoes.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-center text-muted-foreground text-sm">
                    Você ainda não tem inscrições para participar de audiências (videoconferência ou manifestação escrita).
                  </CardContent>
                </Card>
              ) : (
                <ul className="space-y-2">
                  {participacoes.map((p) => {
                    const aud = p.audiencia;
                    return (
                      <Card
                        key={p.id}
                        className="cursor-pointer hover:shadow-md transition-all"
                        onClick={() => aud?.id && navigate(`/audiencias/${aud.id}`)}
                      >
                        <CardContent className="p-4 flex items-start gap-3">
                          <div className="rounded-full bg-primary/10 p-2 shrink-0">
                            {p.tipo === "videoconferencia" ? (
                              <Video className="h-4 w-4 text-primary" />
                            ) : (
                              <FileText className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{aud?.titulo || "Audiência"}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {tipoLabel(p.tipo)} · {aud?.data ? formatData(aud.data) : "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Inscrito em {format(new Date(p.created_at), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Lembretes */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                <Bell className="h-5 w-5" />
                Inscrições para lembretes
              </h2>
              {lembretes.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-center text-muted-foreground text-sm">
                    Você ainda não se inscreveu para receber lembretes de audiências.
                  </CardContent>
                </Card>
              ) : (
                <ul className="space-y-2">
                  {lembretes.map((r) => {
                    const aud = r.audiencia;
                    return (
                      <Card
                        key={r.id}
                        className="cursor-pointer hover:shadow-md transition-all"
                        onClick={() => aud?.id && navigate(`/audiencias/${aud.id}`)}
                      >
                        <CardContent className="p-4 flex items-start gap-3">
                          <div className="rounded-full bg-muted p-2 shrink-0">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{aud?.titulo || "Audiência"}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {aud?.data ? formatData(aud.data) : "—"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </ul>
              )}
            </section>

            <Button variant="outline" onClick={() => navigate("/audiencias")} className="w-full">
              Ver todas as audiências
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
