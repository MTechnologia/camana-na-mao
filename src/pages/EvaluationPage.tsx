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
import { getServiceDisplayName } from "@/lib/mapUtils";
import { Star, ChevronRight, X } from "lucide-react";

export default function EvaluationPage() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { pendingRatings, loading: pendingLoading, markAsSkipped } = usePendingRatings({ limit: 50 });
  const [visit, setVisit] = useState<{ id: string; service_id?: string } | null>(null);
  const [loading, setLoading] = useState(true);

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
        toast.error("Visita não encontrada");
        navigate("/");
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
        .update({ status: "completed" })
        .eq("id", visitId);

      if (visitError) throw visitError;

      toast.success("Avaliação enviada com sucesso!");
      navigate("/");
    } catch (error) {
      console.error("Error updating visit:", error);
      toast.error("Erro ao finalizar avaliação");
    }
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

  // Sem visitId: mostrar lista de avaliações pendentes
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
      <div className="min-h-screen bg-background pb-24 pt-[60px]">
        <PageHeader title="Avaliar serviços visitados" />
        <div className="p-4 space-y-4">
          {pendingRatings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Star className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground mb-4">
                  Nenhuma avaliação pendente no momento.
                </p>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Voltar ao início
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Selecione um serviço abaixo para avaliar sua visita.
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
            </>
          )}
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
            />
          </>
        )}
      </div>
    </div>
  );
}
