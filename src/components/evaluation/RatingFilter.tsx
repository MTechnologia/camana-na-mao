import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export type MinRatingFilter = "all" | 4 | 3 | 2;

interface RatingFilterProps {
  value: MinRatingFilter;
  onChange: (value: MinRatingFilter) => void;
}

const options: { value: MinRatingFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: 4, label: "4+ estrelas" },
  { value: 3, label: "3+ estrelas" },
  { value: 2, label: "2+ estrelas" },
];

export const RatingFilter = ({ value, onChange }: RatingFilterProps) => {
  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4">
      <div className="flex items-center gap-2 min-w-max">
        <Star className="w-4 h-4 text-amber-500 shrink-0" aria-hidden />
        <span className="text-sm text-muted-foreground shrink-0">Avaliação mínima:</span>
        <div className="flex gap-2">
          {options.map((opt) => (
            <Badge
              key={String(opt.value)}
              variant={value === opt.value ? "default" : "outline"}
              className={cn(
                "cursor-pointer whitespace-nowrap transition-all",
                value === opt.value ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
              )}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};
