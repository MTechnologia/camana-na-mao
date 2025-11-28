import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const INTEREST_CATEGORIES = [
  { id: "legislativo", label: "Legislativo", icon: "📜", description: "Projetos de lei e votações" },
  { id: "mobilidade", label: "Mobilidade", icon: "🚌", description: "Transporte e trânsito" },
  { id: "cultura", label: "Cultura", icon: "🎭", description: "Eventos culturais" },
  { id: "saude", label: "Saúde", icon: "🏥", description: "Políticas de saúde" },
  { id: "educacao", label: "Educação", icon: "📚", description: "Escolas e universidades" },
  { id: "meio_ambiente", label: "Meio Ambiente", icon: "🌳", description: "Sustentabilidade" },
  { id: "habitacao", label: "Habitação", icon: "🏠", description: "Moradia e urbanismo" },
  { id: "economia", label: "Economia", icon: "💼", description: "Emprego e comércio" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleContinue = async () => {
    if (selectedInterests.length < 3) {
      toast.error("Selecione pelo menos 3 interesses");
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const interests = selectedInterests.map(category => ({
        user_id: user.id,
        interest_category: category,
      }));

      const { error } = await supabase
        .from('user_interests')
        .insert(interests);

      if (error) throw error;

      toast.success("Interesses salvos com sucesso!");
      navigate("/ia");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar interesses");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6">
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Personalize sua experiência
        </h1>
        <p className="text-muted-foreground mb-6">
          Selecione pelo menos 3 áreas do seu interesse
        </p>

        <div className="grid grid-cols-2 gap-3">
          {INTEREST_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => toggleInterest(category.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedInterests.includes(category.id)
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div className="text-3xl mb-2">{category.icon}</div>
              <h3 className="font-semibold text-foreground text-sm mb-1">
                {category.label}
              </h3>
              <p className="text-xs text-muted-foreground">
                {category.description}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {selectedInterests.length} de 8 selecionados
        </div>
      </div>

      <Button
        onClick={handleContinue}
        disabled={selectedInterests.length < 3 || loading}
        className="w-full h-12 bg-foreground text-background hover:bg-foreground/90"
      >
        {loading ? "Salvando..." : "Continuar"}
      </Button>
    </div>
  );
};

export default Onboarding;
