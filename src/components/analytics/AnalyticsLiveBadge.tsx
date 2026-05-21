import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { AdminLiveIndicator } from "@/components/admin/AdminLiveIndicator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * HU-5.3 — Badge "Ao vivo" para o ReportsAnalyticsPage.
 *
 * Recebe uma lista de `Date | null` (um por hook de analytics visível na
 * página) e exibe um único indicador agregado com o `lastUpdate` mais
 * recente. Inclui um botão de refresh manual que dispara todos os hooks.
 *
 * O AdminLiveIndicator já cuida do refresh do texto relativo a cada 5s.
 */

interface AnalyticsLiveBadgeProps {
  /** Lista de timestamps das últimas atualizações de cada hook ativo. */
  lastUpdates: (Date | null)[];
  /** Disparar refresh manual em todos os hooks observados. */
  onRefresh?: () => void;
  /** Quando true, mostra a animação de "girando" no botão de refresh. */
  refreshing?: boolean;
  className?: string;
  indicatorTone?: "default" | "analyticsBar";
}

export function AnalyticsLiveBadge({
  lastUpdates,
  onRefresh,
  refreshing,
  className,
  indicatorTone = "default",
}: AnalyticsLiveBadgeProps) {
  const mostRecent = useMemo(() => {
    let latest: Date | null = null;
    for (const d of lastUpdates) {
      if (d && (!latest || d.getTime() > latest.getTime())) latest = d;
    }
    return latest;
  }, [lastUpdates]);

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <AdminLiveIndicator lastUpdate={mostRecent} tone={indicatorTone} />
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className={cn(
            "h-7 w-7 p-0",
            indicatorTone === "analyticsBar" &&
              "text-analytics-bar-foreground hover:bg-white/10 hover:text-analytics-bar-foreground",
          )}
          aria-label="Recarregar dados agora"
          title="Recarregar dados agora"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        </Button>
      )}
    </div>
  );
}
