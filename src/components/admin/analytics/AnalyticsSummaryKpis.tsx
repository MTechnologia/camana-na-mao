import { useMemo } from 'react';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { globalFiltersToReportsAnalytics } from '@/lib/globalFiltersToAnalytics';
import { useReportsAnalytics } from '@/hooks/useReportsAnalytics';
import { buildDrillKpisFromStats } from '@/lib/analyticsDrillFromStats';
import { formatKpiValue, metricLabel } from '@/lib/analyticsLabels';
import { KPI_PARAMETER_LEGENDS } from '@/lib/analyticsParameterLegends';
import type { AnalyticsMetric } from '@/types/analyticsDrill';
import { KpiCard } from '@/components/ui/KpiCard';

const metrics: AnalyticsMetric[] = ['volume', 'response_time', 'sentiment', 'patterns'];

export function AnalyticsSummaryKpis() {
  const { period, region, category } = useGlobalFilters();
  const filters = useMemo(
    () => globalFiltersToReportsAnalytics(period, region, category),
    [period, region, category],
  );
  const { stats } = useReportsAnalytics(filters);
  const kpis = useMemo(() => buildDrillKpisFromStats(stats, 'overview'), [stats]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <KpiCard
          key={m}
          label={metricLabel(m)}
          value={formatKpiValue(m, kpis)}
          parameter={KPI_PARAMETER_LEGENDS[m]}
        />
      ))}
    </div>
  );
}
