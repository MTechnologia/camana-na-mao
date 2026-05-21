import { useAnalyticsDrill } from '@/contexts/AnalyticsDrillContext';
import { AnalyticsMetricsStrip } from '@/components/admin/analytics/AnalyticsMetricsStrip';

export function ExecutiveKpiStrip() {
  const { kpis, metric, setMetric } = useAnalyticsDrill();

  return (
    <AnalyticsMetricsStrip
      kpis={kpis}
      selectable
      metric={metric}
      onMetricChange={setMetric}
      hint="Selecione para definir o gráfico territorial"
    />
  );
}
