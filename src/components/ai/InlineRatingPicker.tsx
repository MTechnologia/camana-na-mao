import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineRatingPickerProps {
  onSelect: (stars: number) => void;
}

export const InlineRatingPicker = ({ onSelect }: InlineRatingPickerProps) => {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const handleSelect = (rating: number) => {
    setSelectedRating(rating);
    onSelect(rating);
  };

  if (selectedRating !== null) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <Star className="h-3 w-3 fill-current" />
        <span>Nota {selectedRating} selecionada ✓</span>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Star className="h-3 w-3" />
        <span>De 1 a 5, que nota você dá?</span>
      </div>
      <div className="flex gap-1" role="group" aria-label="Avaliação por estrelas">
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
              aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
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
      <div className="mt-1 flex justify-between text-xs text-muted-foreground px-1">
        <span>Péssimo</span>
        <span>Excelente</span>
      </div>
    </div>
  );
};

export default InlineRatingPicker;
