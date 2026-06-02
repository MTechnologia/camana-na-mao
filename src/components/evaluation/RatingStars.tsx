import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export const RatingStars = ({
  rating,
  onRatingChange,
  readonly = false,
  size = "md",
}: RatingStarsProps) => {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const handleClick = (index: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  return (
    <div className="flex gap-1" role="group" aria-label="Avaliação por estrelas">
      {[...Array(5)].map((_, index) => {
        const isFilled = index < Math.floor(rating);
        const isHalf = index < rating && index >= Math.floor(rating);

        return (
          <button
            key={index}
            type="button"
            data-star={index + 1}
            onClick={() => handleClick(index)}
            disabled={readonly}
            className={cn(
              "relative transition-transform",
              !readonly && "hover:scale-110 cursor-pointer",
              readonly && "cursor-default",
            )}
            aria-label={`${index + 1} estrela${index > 0 ? "s" : ""}`}
          >
            <Star
              className={cn(
                sizes[size],
                "transition-colors",
                isFilled && "fill-amber-400 text-amber-400",
                isHalf && "fill-amber-400 text-amber-400",
                !isFilled && !isHalf && "text-muted",
              )}
              style={
                isHalf
                  ? {
                      clipPath: "inset(0 50% 0 0)",
                    }
                  : undefined
              }
            />
            {isHalf && (
              <Star
                className={cn(sizes[size], "absolute top-0 left-0 text-muted")}
                style={{ clipPath: "inset(0 0 0 50%)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
