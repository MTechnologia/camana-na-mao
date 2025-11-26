import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/page-header";
import FloatingNavbar from "@/components/FloatingNavbar";
import { ChatEvaluation } from "@/components/evaluation/ChatEvaluation";
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
        .single();

      if (error) throw error;
      setVisit(data);
    } catch (error) {
      console.error("Error loading visit:", error);
      toast.error("Erro ao carregar visita");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (data: {
    rating: number;
    comments: string;
    sentiment?: string;
  }) => {
    if (!user || !visitId || !visit) {
      toast.error("Erro ao salvar avaliação");
      return;
    }

    try {
      // Salvar avaliação
      const { error: ratingError } = await supabase
        .from("service_ratings")
        .insert({
          user_id: user.id,
          service_id: visit.service_id,
          visit_id: visitId,
          rating_stars: data.rating,
          rating_text: data.comments,
          sentiment: data.sentiment
        });

      if (ratingError) throw ratingError;

      // Atualizar status da visita
      const { error: visitError } = await supabase
        .from("service_visits")
        .update({ status: "completed" })
        .eq("id", visitId);

      if (visitError) throw visitError;

      toast.success("Avaliação enviada com sucesso!");
      navigate("/");
    } catch (error) {
      console.error("Error saving rating:", error);
      toast.error("Erro ao salvar avaliação");
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
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-1">
                {visit.service.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {visit.service.district}
              </p>
            </CardContent>
          </Card>
        )}

        <ChatEvaluation onComplete={handleComplete} />
      </div>

      <FloatingNavbar />
    </div>
  );
}
