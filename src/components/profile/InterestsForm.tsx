import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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

interface InterestsFormProps {
  userId: string;
  onSuccess?: () => void;
}

const InterestsForm = ({ userId, onSuccess }: InterestsFormProps) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadInterests();
  }, [userId]);

  const loadInterests = async () => {
    try {
      const { data, error } = await supabase
        .from('user_interests')
        .select('interest_category')
        .eq('user_id', userId);

      if (error) throw error;

      if (data) {
        setSelectedInterests(data.map(item => item.interest_category));
      }
    } catch (error: any) {
      console.error("Error loading interests:", error);
      toast.error("Erro ao carregar interesses");
    } finally {
      setLoadingData(false);
    }
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleSave = async () => {
    if (selectedInterests.length < 3) {
      toast.error("Selecione pelo menos 3 interesses");
      return;
    }

    setLoading(true);
    try {
      // Deleta interesses antigos
      const { error: deleteError } = await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insere novos interesses
      const interests = selectedInterests.map(category => ({
        user_id: userId,
        interest_category: category,
      }));

      const { error: insertError } = await supabase
        .from('user_interests')
        .insert(interests);

      if (insertError) throw insertError;

      toast.success("Interesses salvos com sucesso!");
      onSuccess?.();
    } catch (error: any) {
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
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

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {selectedInterests.length} de 8 selecionados
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={selectedInterests.length < 3 || loading}
        className="w-full h-12"
      >
        {loading ? "Salvando..." : "Salvar Interesses"}
      </Button>
    </div>
  );
};

export default InterestsForm;
