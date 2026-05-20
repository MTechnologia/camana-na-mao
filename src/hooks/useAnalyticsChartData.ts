import { useMemo } from 'react';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { buildAnalyticsChartBundle } from '@/lib/analyticsFromStats';
import { globalFiltersToReportsAnalytics } from '@/lib/globalFiltersToAnalytics';
import { useReportsAnalytics } from '@/hooks/useReportsAnalytics';

/** Dados dos gráficos da análise urbanos — API real + derivados para formatos PO. */
export function useAnalyticsChartData() {
  const { period, region, category } = useGlobalFilters();
  const filters = useMemo(
    () => globalFiltersToReportsAnalytics(period, region, category),
    [period, region, category],
  );
  const { stats, isLoading, error } = useReportsAnalytics(filters);

  const chartData = useMemo(
    () => buildAnalyticsChartBundle(stats, period, region, category),
    [stats, period, region, category],
  );

  return {
    ...chartData,
    isLoading,
    error,
  };
}
