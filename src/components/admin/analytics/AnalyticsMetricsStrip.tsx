import type { LucideIcon } from 'lucide-react';
import { BarChart3, Clock3, Layers3, Smile } from 'lucide-react';
import { formatKpiValue, metricLabel, metricShortLabel } from '@/lib/analyticsLabels';
import type { AnalyticsMetric, DrillKpis } from '@/types/analyticsDrill';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const kpiMetrics: AnalyticsMetric[] = ['volume', 'response_time', 'sentiment', 'patterns'];

const metricIcons: Record<AnalyticsMetric, LucideIcon> = {
  volume: BarChart3,
  response_time: Clock3,
  sentiment: Smile,
  patterns: Layers3,
};

type AnalyticsMetricsStripProps = {
  kpis: DrillKpis;
  /** Permite escolher a métrica do gráfico (visão executiva). */
  selectable?: boolean;
  metric?: AnalyticsMetric;
  onMetricChange?: (metric: AnalyticsMetric) => void;
  hint?: string;
};

export function AnalyticsMetricsStrip({
  kpis,
  selectable = false,
  metric,
  onMetricChange,
  hint,
}: AnalyticsMetricsStripProps) {
  return (
    <section aria-label="Indicadores do recorte">
      {(hint || selectable) && (
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Indicadores</h2>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      )}

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {kpiMetrics.map((m) => {
            const selected = selectable && metric === m;
            const Icon = metricIcons[m];
            const content = (
              <>
                {selected ? (
                  <span
                    className="absolute inset-y-0 left-0 w-0.5 bg-primary sm:inset-x-0 sm:bottom-auto sm:top-0 sm:h-0.5 sm:w-auto"
                    aria-hidden
                  />
                ) : null}

                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                      selected
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground',
                      selectable && !selected && 'group-hover:bg-muted/80',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  {selected ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Ativo
                    </span>
                  ) : null}
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground">{metricShortLabel(m)}</p>
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                    {formatKpiValue(m, kpis)}
                  </p>
                </div>
              </>
            );

            const cellClass = cn(
              'group relative flex w-full flex-col gap-2 p-4 text-left transition-colors',
              selectable && 'hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              selected && 'bg-primary/[0.06]',
            );

            if (selectable && onMetricChange) {
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onMetricChange(m)}
                  className={cellClass}
                  aria-pressed={selected}
                  aria-label={`${metricLabel(m)}: ${formatKpiValue(m, kpis)}`}
                >
                  {content}
                </button>
              );
            }

            return (
              <div key={m} className={cellClass} aria-label={`${metricLabel(m)}: ${formatKpiValue(m, kpis)}`}>
                {content}
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
