import { useAnalyticsDrill } from '@/contexts/AnalyticsDrillContext';
import type { AnalyticsMetric } from '@/types/analyticsDrill';
import { metricLabel } from '@/lib/analyticsLabels';
import { cn } from '@/lib/utils';

const metrics: AnalyticsMetric[] = ['volume', 'response_time', 'sentiment', 'patterns'];

export function MetricSwitcher() {
  const { metric, setMetric } = useAnalyticsDrill();

  return (
    <div
      className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1"
      role="group"
      aria-label="Métrica do gráfico territorial"
    >
      {metrics.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMetric(m)}
          className={cn(
            'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
            metric === m
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
          aria-pressed={metric === m}
        >
          {metricLabel(m).replace(' de relatos', '').replace(' agregado', '').replace(' médio de resposta', '')}
        </button>
      ))}
    </div>
  );
}
