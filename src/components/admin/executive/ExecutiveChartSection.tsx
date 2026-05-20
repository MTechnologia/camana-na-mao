import { VolumeByRegionChart } from '@/components/admin/analytics/VolumeByRegionChart';
import { useAnalyticsDrill } from '@/contexts/AnalyticsDrillContext';
import { metricLabel } from '@/lib/analyticsLabels';

export function ExecutiveChartSection() {
  const { metric } = useAnalyticsDrill();

  return (
    <section aria-labelledby="executive-chart-heading" className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="executive-chart-heading" className="text-sm font-semibold text-foreground">
            Leitura territorial
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Métrica: <span className="font-medium text-foreground">{metricLabel(metric)}</span>
            <span className="mx-1.5 text-border">|</span>
            Clique nas barras para aprofundar; use drill-through para listar relatos.
          </p>
        </div>
      </div>
      <VolumeByRegionChart variant="executive" showLegend={false} />
    </section>
  );
}
