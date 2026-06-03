import { AnalyticsLiveBadge } from "@/components/analytics/AnalyticsLiveBadge";
import { useAnalyticsLive } from "@/contexts/AnalyticsLiveContext";
import { useGlobalReportsAnalytics } from "@/contexts/GlobalReportsAnalyticsContext";
import { cn } from "@/lib/utils";

type UnifiedAnalyticsLiveBadgeProps = {
  className?: string;
  /** Apenas "Ao vivo", sem sufixo e sem botão de refresh (mobile). */
  compact?: boolean;
};

/**
 * HU-5.3 — Indicador "Ao vivo" na barra de recorte global.
 * Agrega fontes registradas (analytics global + gestão de relatos, etc.).
 */
export function UnifiedAnalyticsLiveBadge({
  className,
  compact = false,
}: UnifiedAnalyticsLiveBadgeProps) {
  const { lastUpdate, refreshAll } = useAnalyticsLive();
  const { isLoading, refresh } = useGlobalReportsAnalytics();

  return (
    <AnalyticsLiveBadge
      className={cn(className)}
      indicatorTone="analyticsBar"
      compact={compact}
      lastUpdates={[lastUpdate]}
      onRefresh={() => {
        refresh();
        refreshAll();
      }}
      refreshing={isLoading}
    />
  );
}
