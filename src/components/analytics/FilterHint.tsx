import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * HU-14 polish — ícone de ajuda discreto com tooltip explicativo.
 *
 * Uso típico ao lado do label de um filtro ou bloco:
 *
 *   <span>Período</span>
 *   <FilterHint text="Filtra pela data de criação do relato..." />
 *
 * O ícone aparece pequeno e neutro pra não competir visualmente com o label.
 * Abre no hover e no focus (acessível via teclado).
 */
interface FilterHintProps {
  text: string;
  className?: string;
  /** aria-label de fallback caso o tooltip não esteja visível (default = text). */
  ariaLabel?: string;
}

export function FilterHint({ text, className, ariaLabel }: FilterHintProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            tabIndex={0}
            aria-label={ariaLabel ?? text}
            className={cn(
              "inline-flex items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
              className,
            )}
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
