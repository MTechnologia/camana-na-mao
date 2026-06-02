import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * HU-1.5 — KPI consolidado clicável do dashboard executivo.
 *
 * Variante "rica" do KPICard que:
 *   - Suporta valor principal + valor secundário (delta, breakdown).
 *   - Mostra setinha indicando que é clicável.
 *   - Aceita um `onClick` para drill-down (ex: navegar pra aba detalhada).
 *   - Variante de cor por tipo de sinal: default / warning / destructive.
 *
 * É um componente do dashboard executivo, NÃO substitui o KPICard genérico
 * usado em outras telas.
 */

export type KPIVariant = "default" | "warning" | "destructive" | "success";

interface ConsolidatedKPICardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  /** Texto de delta/breakdown abaixo do valor (ex: "↓ 12% vs período anterior"). */
  caption?: string;
  /** Cor de fundo do badge de delta. */
  captionVariant?: KPIVariant;
  icon: LucideIcon;
  /** Chamado ao clicar no card. Ativa o cursor e a setinha de drill. */
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
}

const variantClasses: Record<KPIVariant, string> = {
  default: "bg-primary/10 text-primary",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  destructive: "bg-destructive/10 text-destructive",
  success: "bg-green-500/15 text-green-700 dark:text-green-400",
};

export function ConsolidatedKPICard({
  title,
  subtitle,
  value,
  caption,
  captionVariant = "default",
  icon: Icon,
  onClick,
  isLoading,
  className,
}: ConsolidatedKPICardProps) {
  const isInteractive = typeof onClick === "function";

  return (
    <Card
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!isInteractive) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "p-4 group transition-all",
        isInteractive &&
          "cursor-pointer hover:border-primary/50 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        className,
      )}
      aria-label={isInteractive ? `${title} — clique para ver detalhes` : title}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="rounded-lg bg-muted p-1.5 shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>

      {isLoading ? (
        <div className="h-8 w-24 bg-muted/40 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        {caption ? (
          <Badge
            variant="secondary"
            className={cn("text-[10px] font-medium", variantClasses[captionVariant])}
          >
            {caption}
          </Badge>
        ) : (
          <span />
        )}
        {isInteractive && (
          <ArrowUpRight
            className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            aria-hidden="true"
          />
        )}
      </div>
    </Card>
  );
}
