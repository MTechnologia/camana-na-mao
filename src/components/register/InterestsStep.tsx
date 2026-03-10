import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { INTEREST_ICONS } from "@/components/icons";
import CollapsibleInfoCard from "./CollapsibleInfoCard";

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

interface InterestsStepProps {
  selectedInterests: string[];
  onToggle: (interestId: string) => void;
  onContinue: () => void;
  loading?: boolean;
}

const InterestsStep = ({ selectedInterests, onToggle, onContinue, loading }: InterestsStepProps) => {
  const canContinue = selectedInterests.length >= 3;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Seus interesses</h2>
        <p className="text-muted-foreground text-sm">
          Selecione pelo menos 3 áreas do seu interesse
        </p>
      </div>

      {/* Card explicativo colapsável */}
      <CollapsibleInfoCard
        icon={Sparkles}
        title="Experiência personalizada"
        description="Com base nos seus interesses, vamos destacar notícias, audiências públicas e projetos de lei que são mais relevantes para você."
      />

      {/* Grid de interesses */}
      <div className="grid grid-cols-2 gap-3">
        {INTEREST_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => onToggle(category.id)}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              selectedInterests.includes(category.id)
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <div className="flex items-center justify-center w-9 h-9 mb-2 text-primary">
              {INTEREST_ICONS[category.id] && (() => {
                const Icon = INTEREST_ICONS[category.id];
                return <Icon size={28} aria-hidden />;
              })()}
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-0.5">
              {category.label}
            </h3>
            <p className="text-xs text-muted-foreground">
              {category.description}
            </p>
          </button>
        ))}
      </div>

      {/* Contador */}
      <div className="text-center text-sm text-muted-foreground">
        {selectedInterests.length} de {INTEREST_CATEGORIES.length} selecionados
        {selectedInterests.length < 3 && (
          <span className="text-primary ml-1">
            (mínimo: 3)
          </span>
        )}
      </div>

      {/* Botão */}
      <Button
        onClick={onContinue}
        disabled={!canContinue || loading}
        className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl"
      >
        {loading ? "Criando sua conta..." : "Finalizar cadastro"}
      </Button>
    </div>
  );
};

export default InterestsStep;
