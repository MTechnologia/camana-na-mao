import { useAnalyticsDrill } from '@/contexts/AnalyticsDrillContext';
import { formatKpiValue, metricLabel } from '@/lib/analyticsLabels';
import { KPI_PARAMETER_LEGENDS } from '@/lib/analyticsParameterLegends';
import type { AnalyticsMetric } from '@/types/analyticsDrill';
import { KpiCard } from '@/components/ui/KpiCard';
import { cn } from '@/lib/utils';

const kpiMetrics: AnalyticsMetric[] = ['volume', 'response_time', 'sentiment', 'patterns'];

export function ExecutiveKpiRow() {
  const { kpis, metric, setMetric } = useAnalyticsDrill();

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpiMetrics.map((m) => (
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
            'cursor-pointer rounded-xl text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            metric === m && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
          )}
          aria-pressed={metric === m}
        >
          <KpiCard
            label={metricLabel(m)}
            value={formatKpiValue(m, kpis)}
            parameter={KPI_PARAMETER_LEGENDS[m]}
            stopParameterPropagation
          />
        </div>
      ))}
    </div>
  );
}
