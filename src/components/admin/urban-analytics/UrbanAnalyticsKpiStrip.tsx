import { useMemo } from 'react';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { globalFiltersToReportsAnalytics } from '@/lib/globalFiltersToAnalytics';
import { useReportsAnalytics } from '@/hooks/useReportsAnalytics';
import { buildDrillKpisFromStats } from '@/lib/analyticsDrillFromStats';
import { AnalyticsMetricsStrip } from '@/components/admin/analytics/AnalyticsMetricsStrip';

export function UrbanAnalyticsKpiStrip() {
  const { period, region, category } = useGlobalFilters();
  const filters = useMemo(
    () => globalFiltersToReportsAnalytics(period, region, category),
    [period, region, category],
  );
  const { stats } = useReportsAnalytics(filters);
  const kpis = useMemo(() => buildDrillKpisFromStats(stats, 'overview'), [stats]);

  return <AnalyticsMetricsStrip kpis={kpis} />;
}
