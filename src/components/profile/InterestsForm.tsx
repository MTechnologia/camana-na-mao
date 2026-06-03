import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { INTEREST_ICONS } from "@/components/icons";
import { syncInterestAudienciaAlerts } from "@/lib/syncInterestAudienciaAlerts";

const INTEREST_CATEGORIES = [
  {
    id: "legislativo",
    label: "Legislativo",
    icon: "📜",
    description: "Projetos de lei e votações",
  },
  { id: "mobilidade", label: "Mobilidade", icon: "🚌", description: "Transporte e trânsito" },
  { id: "cultura", label: "Cultura", icon: "🎭", description: "Eventos culturais" },
  { id: "saude", label: "Saúde", icon: "🏥", description: "Políticas de saúde" },
  { id: "educacao", label: "Educação", icon: "📚", description: "Escolas e universidades" },
  { id: "meio_ambiente", label: "Meio Ambiente", icon: "🌳", description: "Sustentabilidade" },
  { id: "habitacao", label: "Habitação", icon: "🏠", description: "Moradia e urbanismo" },
  { id: "economia", label: "Economia", icon: "💼", description: "Emprego e comércio" },
];

interface InterestsFormProps {
  userId: string;
  onSuccess?: () => void;
}

const InterestsForm = ({ userId, onSuccess }: InterestsFormProps) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const loadInterests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("user_interests")
        .select("interest_category")
        .eq("user_id", userId);

      if (error) throw error;

      if (data) {
        setSelectedInterests(data.map((item) => item.interest_category));
      }
    } catch (error: unknown) {
      console.error("Error loading interests:", error);
      toast.error("Erro ao carregar interesses");
    } finally {
      setLoadingData(false);
    }
  }, [userId]);

  useEffect(() => {
    loadInterests();
  }, [loadInterests]);

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId) ? prev.filter((id) => id !== interestId) : [...prev, interestId],
    );
  };

  const handleSave = async () => {
    if (selectedInterests.length < 3) {
      toast.error("Selecione pelo menos 3 interesses");
      return;
    }

    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from("user_interests")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      const interests = selectedInterests.map((category) => ({
        user_id: userId,
        interest_category: category,
      }));

      const { error: insertError } = await supabase.from("user_interests").insert(interests);

      if (insertError) throw insertError;

      const { synced, error: syncError } = await syncInterestAudienciaAlerts(
        userId,
        selectedInterests,
      );
      if (syncError) {
        console.warn("[InterestsForm] sync audiencia alerts:", syncError);
      } else if (synced.length > 0) {
        toast.success(
          `Interesses salvos! Alertas de audiência ativados para: ${synced.join(", ")}.`,
        );
      } else {
        toast.success("Interesses salvos com sucesso!");
      }
      onSuccess?.();
    } catch (error: unknown) {
      console.error("Error saving interests:", error);
      toast.error("Erro ao salvar interesses");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const progressPercentage = (selectedInterests.length / INTEREST_CATEGORIES.length) * 100;
  const isMinimumMet = selectedInterests.length >= 3;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            Seus Interesses
          </CardTitle>
          <CardDescription>
            Personalize sua experiência selecionando áreas do seu interesse. Selecione pelo menos 3.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedInterests.length} de {INTEREST_CATEGORIES.length} selecionados
              </span>
              <span
                className={isMinimumMet ? "text-green-600 font-medium" : "text-muted-foreground"}
              >
                {isMinimumMet ? "✓ Mínimo atingido" : "Mínimo: 3"}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Interest grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {INTEREST_CATEGORIES.map((category) => {
              const isSelected = selectedInterests.includes(category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => toggleInterest(category.id)}
                  className={`p-3 rounded-xl border-2 transition-all text-left group ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-center w-9 h-9 mb-1.5 text-primary transition-transform group-hover:scale-110">
                    {INTEREST_ICONS[category.id] &&
                      (() => {
                        const Icon = INTEREST_ICONS[category.id];
                        return <Icon size={28} aria-hidden />;
                      })()}
                  </div>
                  <h3 className="font-semibold text-foreground text-sm leading-tight">
                    {category.label}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                    {category.description}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={selectedInterests.length < 3 || loading}
        className="w-full h-11"
      >
        {loading ? "Salvando..." : "Salvar Interesses"}
      </Button>
    </div>
  );
};

export default InterestsForm;
