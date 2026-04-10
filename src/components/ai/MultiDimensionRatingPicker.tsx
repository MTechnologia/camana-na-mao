import { useRef, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SERVICE_RATING_DIMENSION_KEYS,
  SERVICE_RATING_DIMENSION_LABELS,
  type ServiceRatingDimensionKey,
  type ServiceRatingDimensions,
} from "@/lib/serviceRatingDimensions";

export interface MultiDimensionRatingPickerProps {
  onComplete: (dims: ServiceRatingDimensions) => void;
}

/**
 * Quatro linhas (labels de `SERVICE_RATING_DIMENSION_LABELS`) com 5 estrelas cada,
 * mesmo padrão visual de {@link InlineRatingPicker} (tamanho, âmbar, hover).
 */
export function MultiDimensionRatingPicker({ onComplete }: MultiDimensionRatingPickerProps) {
  const [selections, setSelections] = useState<Partial<Record<ServiceRatingDimensionKey, number>>>(
    {},
  );
  const [hovered, setHovered] = useState<{ key: ServiceRatingDimensionKey; star: number } | null>(
    null,
  );
  const completeFiredRef = useRef(false);

  const pickStar = (key: ServiceRatingDimensionKey, star: number) => {
    if (completeFiredRef.current) return;
    setSelections((prev) => {
      if (completeFiredRef.current) return prev;
      const next = { ...prev, [key]: star };
      const complete = SERVICE_RATING_DIMENSION_KEYS.every(
        (k) => typeof next[k] === "number" && (next[k] as number) >= 1 && (next[k] as number) <= 5,
      );
      if (complete) {
        completeFiredRef.current = true;
        const dims = SERVICE_RATING_DIMENSION_KEYS.reduce((acc, k) => {
          acc[k] = next[k] as number;
          return acc;
        }, {} as ServiceRatingDimensions);
        queueMicrotask(() => onComplete(dims));
      }
      return next;
    });
  };

  return (
    <div className="mt-2 w-full space-y-4">
      <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
        <Star className="h-3 w-3" />
        <span>Avalie cada aspecto de 1 a 5 estrelas</span>
      </div>
      {SERVICE_RATING_DIMENSION_KEYS.map((dimKey) => (
        <div key={dimKey} className="border-t border-border/60 pt-3 first:border-t-0 first:pt-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-sm font-medium text-foreground shrink-0">
              {SERVICE_RATING_DIMENSION_LABELS[dimKey]}
            </span>
            <div
              className="flex gap-1"
              role="group"
              aria-label={`Avaliação: ${SERVICE_RATING_DIMENSION_LABELS[dimKey]}`}
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const selected = selections[dimKey];
                const hoverStar = hovered?.key === dimKey ? hovered.star : null;
                const isFilled = star <= (hoverStar ?? selected ?? 0);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => pickStar(dimKey, star)}
                    onMouseEnter={() => setHovered({ key: dimKey, star })}
                    onMouseLeave={() => setHovered(null)}
                    className="relative p-1 transition-transform hover:scale-110"
                    aria-label={`${SERVICE_RATING_DIMENSION_LABELS[dimKey]}: ${star} estrela${
                      star > 1 ? "s" : ""
                    }`}
                  >
                    <Star
                      className={cn(
                        "w-8 h-8 transition-colors",
                        isFilled
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/50 hover:text-amber-300",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default MultiDimensionRatingPicker;
