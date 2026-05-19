import { ChevronRight, RotateCcw } from 'lucide-react';
import { useAnalyticsDrill } from '@/contexts/AnalyticsDrillContext';
import { metricLabel } from '@/lib/analyticsLabels';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { USE_UNIFIED_ANALYTICS_CONTEXT_BAR } from '@/config/analyticsUi';
import { labelForCategory, labelForPeriod } from '@/lib/globalFilterOptions';
import { cn } from '@/lib/utils';

export function AnalyticsDrillBreadcrumb() {
  const { drillPath, drillUp, clearDrill, metric, grain } = useAnalyticsDrill();
  const { period, region, category } = useGlobalFilters();

  const hasActiveRecorte =
    drillPath.length > 1 || grain !== 'overview' || region !== 'all' || category !== 'all';

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:flex-row sm:items-stretch">
      <nav
        aria-label="Contexto analítico"
        className="flex flex-1 flex-wrap items-center gap-1 px-3 py-2.5 text-sm sm:px-4"
      >
        {drillPath.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> : null}
            {i === drillPath.length - 1 ? (
              <span className="font-semibold text-foreground">{crumb.label}</span>
            ) : (
              <button
                type="button"
                className="rounded px-0.5 text-muted-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => drillUp(i)}
              >
                {crumb.label}
              </button>
            )}
          </span>
        ))}
        <ChevronRight className="mx-0.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <span className="font-medium text-foreground/90">{metricLabel(metric)}</span>
        {!USE_UNIFIED_ANALYTICS_CONTEXT_BAR ? (
          <>
            <span className="text-muted-foreground" aria-hidden>
              ·
            </span>
            <span className="text-xs text-muted-foreground">
              {labelForPeriod(period)} · {labelForCategory(category)}
            </span>
          </>
        ) : null}
      </nav>

      <div className="flex items-center px-3 py-2 sm:px-4 sm:py-0">
        <button
          type="button"
          disabled={!hasActiveRecorte}
          onClick={clearDrill}
          aria-label="Limpar recorte analítico e restaurar visão geral"
          className={cn(
            'inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold',
            'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            hasActiveRecorte
              ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-[0.98]'
              : 'cursor-not-allowed border border-dashed border-border bg-background/80 text-muted-foreground opacity-70',
          )}
        >
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full',
              hasActiveRecorte ? 'bg-primary-foreground/15' : 'bg-muted',
            )}
            aria-hidden
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </span>
          Limpar recorte
        </button>
      </div>
    </div>
  );
}
