import { useAnalyticsDrill } from '@/contexts/AnalyticsDrillContext';
import { formatKpiValue, metricShortLabel } from '@/lib/analyticsLabels';
import type { AnalyticsMetric } from '@/types/analyticsDrill';
import { KpiCard } from '@/components/ui/KpiCard';
import { cn } from '@/lib/utils';

const kpiMetrics: AnalyticsMetric[] = ['volume', 'response_time', 'sentiment', 'patterns'];

export function ExecutiveKpiRow() {
  const { kpis, metric, setMetric } = useAnalyticsDrill();

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpiMetrics.map((m) => {
        const selected = metric === m;
        return (
          <div
            key={m}
            role="button"
            tabIndex={0}
            onClick={() => setMetric(m)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setMetric(m);
              }
            }}
            className={cn(
              'rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
            )}
            aria-pressed={selected}
            aria-label={`${metricShortLabel(m)}: ${formatKpiValue(m, kpis)}`}
          >
            <KpiCard
              compact
              showParameter={false}
              label={metricShortLabel(m)}
              value={formatKpiValue(m, kpis)}
              className={cn(
                'h-full transition-shadow',
                selected ? 'border-primary shadow-sm' : 'hover:shadow-sm',
              )}
              stopParameterPropagation
            />
          </div>
        );
      })}
    </div>
  );
}
