import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { needsVerificationForLowAverageRating } from "@/lib/serviceRatingVerification";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

type LowRatingVerificationBadgeProps = {
  averageRating: number | null | undefined;
  totalRatings: number | null | undefined;
  className?: string;
  /** Só ícone + tooltip (cards e mapas compactos) */
  compact?: boolean;
};

export function LowRatingVerificationBadge({
  averageRating,
  totalRatings,
  className,
  compact = false,
}: LowRatingVerificationBadgeProps) {
  if (!needsVerificationForLowAverageRating(averageRating, totalRatings)) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "gap-1 border-amber-600/50 bg-amber-500/15 text-amber-900 dark:text-amber-200 shrink-0 cursor-default",
            compact ? "px-1.5 py-0" : "text-[11px]",
            className,
          )}
          aria-label="Equipamento sinalizado para verificação: média abaixo de 2 estrelas"
        >
          <AlertTriangle
            className={cn("shrink-0", compact ? "h-3 w-3" : "h-3.5 w-3.5")}
            aria-hidden
          />
          {!compact && <span>Verificação</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left">
        <p className="font-medium mb-1">Média abaixo de 2 estrelas</p>
        <p className="text-muted-foreground text-xs font-normal">
          Este equipamento está sinalizado para verificação administrativa, com base nas avaliações
          publicadas.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
