import { useMemo } from 'react';
import { useUrbanReportsAnalyticsFilters } from '@/contexts/UrbanReportsAnalyticsFiltersContext';
import { buildAnalyticsChartBundle } from '@/lib/analyticsFromStats';
/** Dados dos gráficos da análise de relatos urbanos — API real + derivados para formatos PO. */
export function useAnalyticsChartData() {
  const { period, category, stats, isLoading, error } = useUrbanReportsAnalyticsFilters();

  const chartData = useMemo(
    () => buildAnalyticsChartBundle(stats, period, 'all', category),
    [stats, period, category],
  );

  return {
    ...chartData,
    isLoading,
    error,
  };
}
