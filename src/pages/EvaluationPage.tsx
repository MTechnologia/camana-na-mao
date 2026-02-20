import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/page-header";

import { ConversationalEvaluation } from "@/components/evaluation/ConversationalEvaluation";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function EvaluationPage() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [visitId, user]);

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

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader 
        title={visit ? `Avaliar ${visit.service.name}` : "Avaliar Serviço"} 
      />
      
      <div className="p-4 space-y-4">
        {visit && (
          <>
            <Card data-testid="service-card">
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
        {!visit && !loading && (
          <ConversationalEvaluation
            evaluationContext={null}
            onComplete={() => {
              toast.success("Avaliação enviada com sucesso!");
              navigate("/");
            }}
          />
        )}
      </div>

    </div>
  );
}
