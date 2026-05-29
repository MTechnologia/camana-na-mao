import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/page-header";

import { ConversationalEvaluation } from "@/components/evaluation/ConversationalEvaluation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingRatings } from "@/hooks/usePendingRatings";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { buildVisitCloseUpdate } from "@/lib/closeServiceVisitDeparture";
import { getServiceDisplayName } from "@/lib/mapUtils";
import { evaluationVisitErrorMessage, validateEvaluationVisit } from "@/lib/evaluationVisit";
import { Star, ChevronRight, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function EvaluationPage() {
  type VisitWithService = {
    id: string;
    departed_at?: string | null;
    service_id?: string;
    service: {
      name: string;
      district: string;
      service_type: string;
    };
  };

  const { visitId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { pendingRatings, loading: pendingLoading, markAsSkipped } = usePendingRatings({ limit: 50 });
  const [visit, setVisit] = useState<VisitWithService | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluationDone, setEvaluationDone] = useState(false);
  const [freeEvaluationDone, setFreeEvaluationDone] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast.error("Faça login para avaliar");
      navigate("/login");
      return;
    }

    if (visitId) {
      loadVisit();
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadVisit/navigate intentionally excluded
  }, [visitId, user, authLoading]);

  const loadVisit = async () => {
    try {
      const { data, error } = await supabase
        .from("service_visits")
        .select(`
          *,
          service:public_services (*)
        `)
        .eq("id", visitId)
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading visit:", error);
        throw error;
      }

      if (!data) {
        toast.error(evaluationVisitErrorMessage("not_found"));
        navigate("/avaliar");
        return;
      }

      const visitCheck = validateEvaluationVisit({
        id: data.id,
        status: data.status,
        expires_at: data.expires_at,
        departed_at: data.departed_at,
      });
      if (!visitCheck.ok) {
        toast.error(evaluationVisitErrorMessage(visitCheck.reason));
        navigate("/avaliar");
        return;
      }

      setVisit(data);
    } catch (error) {
      console.error("Error loading visit:", error);
      toast.error("Erro ao carregar visita");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (_data: {
    rating: number;
    comments: string;
    sentiment?: string;
  }) => {
    if (!visitId || !visit) return;

    try {
      // A avaliação já foi salva pelo create_service_rating (IA). Só atualizamos o status da visita.
      const { error: visitError } = await supabase
        .from("service_visits")
        .update(buildVisitCloseUpdate("completed", visit.departed_at ?? null))
        .eq("id", visitId);

      if (visitError) throw visitError;

      toast.success("Avaliação enviada com sucesso!");
      setEvaluationDone(true);
    } catch (error) {
      console.error("Error updating visit:", error);
      toast.error("Erro ao finalizar avaliação");
    }
  };

  /** Modo livre: registro e visita virtual já vêm do create_service_rating na edge; só feedback na UI. */
  const handleFreeEvaluationComplete = () => {
    toast.success("Avaliação registrada com sucesso!");
    setFreeEvaluationDone(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-[60px]">
        <PageHeader title="Carregando..." />
        <div className="p-4">
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  // Sem visitId: visitas pendentes + modo livre (mesmo roteiro de dimensões do orchestrator)
  if (!visitId) {
    if (pendingLoading) {
      return (
        <div className="min-h-screen bg-background pb-24 pt-[60px]">
          <PageHeader title="Avaliar Serviço" />
          <div className="p-4">
            <Skeleton className="h-[200px] w-full" />
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background flex flex-col pb-24 pt-[60px]">
        <PageHeader title="Avaliar serviços" />
        <div className="p-4 flex-1 flex flex-col gap-6 min-h-0 max-w-3xl mx-auto w-full">
          {pendingRatings.length > 0 && (
            <section aria-labelledby="pending-visits-heading" className="space-y-3 shrink-0">
              <h2 id="pending-visits-heading" className="text-base font-semibold text-foreground">
                Visitas detectadas
              </h2>
              <p className="text-sm text-muted-foreground">
                Selecione um serviço para avaliar a visita registrada pelo app.
              </p>
              <div className="space-y-2">
                {pendingRatings.map((rating) => (
                  <Card
                    key={rating.id}
                    className="overflow-hidden transition-colors hover:bg-muted/50"
                  >
                    <CardContent className="p-0">
                      <div className="flex items-center gap-3 p-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {getServiceDisplayName({
                              name: rating.service.name,
                              address: rating.service.address,
                              district: rating.service.district,
                              service_type: rating.service.service_type,
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {rating.service.district}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => navigate(`/avaliar/${rating.id}`)}
                          >
                            Avaliar
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => markAsSkipped(rating.id)}
                            aria-label="Dispensar"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {pendingRatings.length === 0 && (
            <Card className="shrink-0 border-dashed">
              <CardContent className="p-4 flex gap-3 items-start">
                <Star className="w-9 h-9 text-muted-foreground/60 shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-foreground">Nenhuma visita pendente</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Quando o app detectar que você esteve em um serviço público, a avaliação pode aparecer aqui. Enquanto isso, use o modo livre abaixo.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {pendingRatings.length > 0 && <Separator />}

          <section
            aria-labelledby="free-eval-heading"
            className="flex flex-col gap-3 flex-1 min-h-[min(65dvh,600px)]"
            data-testid="free-evaluation-section"
          >
            <h2 id="free-eval-heading" className="text-base font-semibold text-foreground">
              {pendingRatings.length > 0 ? "Ou avalie outro serviço (modo livre)" : "Modo livre"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Informe tipo e nome do equipamento — o assistente contextualiza a avaliação conforme o tipo selecionado, com dicas específicas antes das dimensões.
            </p>
            <div className="flex-1 flex flex-col min-h-0 min-h-[420px]">
              <ConversationalEvaluation
                evaluationContext={null}
                onComplete={handleFreeEvaluationComplete}
                completed={freeEvaluationDone}
              />
            </div>
            {freeEvaluationDone && (
              <Card className="shrink-0 border-primary/30 bg-primary/5">
                <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-foreground">
                    Sua avaliação foi registrada. A visita foi vinculada na base para manter o histórico consistente.
                  </p>
                  <div className="flex flex-col gap-2 shrink-0 sm:flex-row">
                    <Button variant="outline" size="sm" onClick={() => navigate("/servicos-proximos")}>
                      Ir para Perto de você
                    </Button>
                    <Button size="sm" onClick={() => navigate("/")}>
                      Voltar ao início
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>
    );
  }

  // Com visitId: formulário de avaliação da visita
  return (
    <div className="h-[100dvh] min-h-screen bg-background flex flex-col overflow-hidden pb-24 pt-[60px]">
      <PageHeader
        title={visit ? `Avaliar ${visit.service.name}` : "Avaliar Serviço"}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 gap-4">
        {visit && (
          <>
            <Card data-testid="service-card" className="shrink-0">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-1">
                  {visit.service.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {visit.service.district}
                </p>
              </CardContent>
            </Card>

            <ConversationalEvaluation
              evaluationContext={{
                visit_id: visitId!,
                service_id: visit.service_id,
                service_name: visit.service.name,
                service_type: visit.service.service_type,
                district: visit.service.district,
              }}
              onComplete={handleComplete}
              completed={evaluationDone}
            />
            {evaluationDone && (
              <Card className="shrink-0 border-primary/30 bg-primary/5">
                <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-foreground">
                    Sua avaliação foi registrada. Use o botão abaixo quando quiser sair — assim você não perde filtros ou outras telas por um redirecionamento automático.
                  </p>
                  <div className="flex flex-col gap-2 shrink-0 sm:flex-row">
                    <Button variant="outline" size="sm" onClick={() => navigate("/servicos-proximos")}>
                      Ir para Perto de você
                    </Button>
                    <Button size="sm" onClick={() => navigate("/")}>
                      Voltar ao início
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
