import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Labels padrão (avaliação geral): extremos apenas */
const DEFAULT_LABELS: readonly string[] = ["Péssimo", "", "", "", "Excelente"];

/** Labels de 5 níveis para dimensões específicas (atendimento, infraestrutura, etc.) */
const FIVE_LEVEL_LABELS: readonly string[] = [
  "Péssimo",
  "Ruim",
  "Regular",
  "Bom",
  "Excelente",
] as const;

interface InlineRatingPickerProps {
  onSelect: (stars: number) => void;
  /** Chave da dimensão (ex: "atendimento"). Se informada, ativa labels de 5 níveis. */
  dimensionKey?: string;
  /** Labels customizados para cada estrela (1–5). Se omitido, usa defaults. */
  labels?: readonly string[];
  /** Texto de instrução exibido acima das estrelas. */
  promptText?: string;
}

export const InlineRatingPicker = ({
  onSelect,
  dimensionKey,
  labels,
  promptText,
}: InlineRatingPickerProps) => {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  // Se tem dimensionKey e não passou labels, usa os 5 níveis
  const effectiveLabels = labels ?? (dimensionKey ? FIVE_LEVEL_LABELS : DEFAULT_LABELS);
  const defaultPrompt = dimensionKey
    ? `De 1 a 5, como você avalia o ${dimensionKey}?`
    : "De 1 a 5, que nota você dá?";
  const effectivePrompt = promptText ?? defaultPrompt;

  const handleSelect = (rating: number) => {
    setSelectedRating(rating);
    onSelect(rating);
  };

  // Label visível para a estrela em hover ou selecionada
  const activeIndex = (hoveredStar ?? selectedRating ?? 0) - 1;
  const activeLabel = activeIndex >= 0 ? effectiveLabels[activeIndex] : "";

  if (selectedRating !== null) {
    const selLabel = effectiveLabels[selectedRating - 1] || "";
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <Star className="h-3 w-3 fill-current" />
<<<<<<< HEAD
        <span>
          {dimensionKey
            ? `${dimensionKey.charAt(0).toUpperCase() + dimensionKey.slice(1)}: ${selectedRating} estrelas (${selLabel}) ✓`
            : `Nota ${selectedRating} selecionada ✓`}
        </span>
=======
        <span>Avaliação geral: {selectedRating}/5 ✓</span>
>>>>>>> main
      </div>
    );
  }

  return (
    <div className="mt-2 w-full">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Star className="h-3 w-3" />
<<<<<<< HEAD
        <span>{effectivePrompt}</span>
=======
        <span>
          <strong className="text-foreground">Avaliação geral</strong> — de 1 a 5 (1 = muito ruim, 5 = excelente)
        </span>
>>>>>>> main
      </div>
      <div className="flex gap-1" role="group" aria-label={dimensionKey ? `Avaliação de ${dimensionKey}` : "Avaliação por estrelas"}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= (hoveredStar ?? 0);
          return (
            <button
              key={star}
              type="button"
              data-star={star}
              onClick={() => handleSelect(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(null)}
              className="relative p-1 transition-transform hover:scale-110"
              aria-label={`${star} estrela${star > 1 ? 's' : ''} — ${effectiveLabels[star - 1] || ''}`}
            >
              <Star
                className={cn(
                  "w-8 h-8 transition-colors",
                  isFilled 
                    ? "fill-amber-400 text-amber-400" 
                    : "text-muted-foreground/50 hover:text-amber-300"
                )}
              />
            </button>
          );
        })}
      </div>
<<<<<<< HEAD
      {/* Label dinâmico no hover ou extremos fixos */}
      {dimensionKey && activeLabel ? (
        <div className="mt-1 text-center text-xs font-medium text-amber-600 dark:text-amber-400 min-h-[1.25rem]">
          {activeLabel}
        </div>
      ) : (
        <div className="mt-1 flex justify-between text-xs text-muted-foreground px-1">
          <span>{effectiveLabels[0] || "Péssimo"}</span>
          <span>{effectiveLabels[4] || "Excelente"}</span>
        </div>
      )}
=======
      <div className="mt-1 flex justify-between text-xs text-muted-foreground px-1">
        <span>Muito ruim</span>
        <span>Excelente</span>
      </div>
>>>>>>> main
    </div>
  );
};

export default InlineRatingPicker;
