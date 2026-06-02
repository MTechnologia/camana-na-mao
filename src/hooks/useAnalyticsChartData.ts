import { useMemo } from "react";
import { useUrbanReportsAnalyticsFilters } from "@/contexts/UrbanReportsAnalyticsFiltersContext";
import { buildAnalyticsChartBundle } from "@/lib/analyticsFromStats";
/** Dados dos gráficos da análise de relatos urbanos — API real + derivados para formatos PO. */
export function useAnalyticsChartData() {
  const { period, region, category, stats, isLoading, error } = useUrbanReportsAnalyticsFilters();

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
