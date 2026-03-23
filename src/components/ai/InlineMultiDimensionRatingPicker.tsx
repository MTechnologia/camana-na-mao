import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SERVICE_RATING_DIMENSION_KEYS,
  SERVICE_RATING_DIMENSION_LABELS,
  type ServiceRatingDimensions,
} from "@/lib/serviceRatingDimensions";

interface InlineMultiDimensionRatingPickerProps {
  onSubmit: (dimensions: ServiceRatingDimensions) => void;
}

const initialState = (): Record<keyof ServiceRatingDimensions, number | null> => ({
  atendimento: null,
  limpeza: null,
  infraestrutura: null,
  tempo_espera: null,
});

export function InlineMultiDimensionRatingPicker({ onSubmit }: InlineMultiDimensionRatingPickerProps) {
  const [scores, setScores] = useState(initialState);
  const [submitted, setSubmitted] = useState(false);

  const setDim = (key: keyof ServiceRatingDimensions, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  const allSet = SERVICE_RATING_DIMENSION_KEYS.every((k) => scores[k] != null && scores[k]! >= 1 && scores[k]! <= 5);

  const handleSubmit = () => {
    if (!allSet) return;
    const dim: ServiceRatingDimensions = {
      atendimento: scores.atendimento!,
      limpeza: scores.limpeza!,
      infraestrutura: scores.infraestrutura!,
      tempo_espera: scores.tempo_espera!,
    };
    setSubmitted(true);
    onSubmit(dim);
  };

  if (submitted) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <Star className="h-3 w-3 fill-current" />
        <span>Avaliação enviada ✓</span>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full max-w-sm space-y-4" role="form" aria-label="Avaliação por dimensão">
      <p className="text-xs text-muted-foreground">
        Toque nas estrelas em cada linha (1 = muito ruim, 5 = excelente). Depois clique em{" "}
        <strong>Enviar avaliação</strong>.
      </p>
      {SERVICE_RATING_DIMENSION_KEYS.map((key) => (
        <div key={key} className="space-y-1">
          <div className="text-xs font-medium text-foreground">{SERVICE_RATING_DIMENSION_LABELS[key]}</div>
          <div className="flex gap-0.5" role="group" aria-label={SERVICE_RATING_DIMENSION_LABELS[key]}>
            {[1, 2, 3, 4, 5].map((star) => {
              const selected = scores[key];
              const isFilled = selected != null && star <= selected;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setDim(key, star)}
                  className="relative p-0.5 transition-transform hover:scale-110"
                  aria-label={`${SERVICE_RATING_DIMENSION_LABELS[key]}: ${star} de 5`}
                >
                  <Star
                    className={cn(
                      "w-7 h-7 transition-colors sm:w-8 sm:h-8",
                      isFilled
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/50 hover:text-amber-300"
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <Button type="button" size="sm" className="w-full" disabled={!allSet} onClick={handleSubmit}>
        Enviar avaliação
      </Button>
    </div>
  );
}

export default InlineMultiDimensionRatingPicker;
