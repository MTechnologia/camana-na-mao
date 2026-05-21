import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ChartCard } from '@/components/admin/analytics/ChartCard';
import { heatmapChartLegend, heatmapMetricLabel, type HeatmapMetricId } from '@/lib/analyticsParameterLegends';

type HeatmapPanelShellProps = {
  metricId: HeatmapMetricId;
  subtitle?: string;
  filters?: ReactNode;
  footer?: ReactNode;
  error?: string | null;
  children: ReactNode;
  aside?: ReactNode;
};

export function HeatmapPanelShell({
  metricId,
  subtitle,
  filters,
  footer,
  error,
  children,
  aside,
}: HeatmapPanelShellProps) {
  const title = heatmapMetricLabel(metricId);

  return (
    <div className="flex flex-col gap-4">
      {filters}

      <ChartCard
        title={title}
        subtitle={subtitle ?? 'Visualização territorial no recorte selecionado'}
        legend={heatmapChartLegend(metricId)}
        className="border-border/80 shadow-sm"
        contentClassName="pb-4"
      >
        {error ? (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </div>
        ) : null}
        {children}
        {footer}
      </ChartCard>

      {aside}
    </div>
  );
}
