import { useMemo } from "react";
import { buildAnalyticsChartBundle } from "@/lib/analyticsFromStats";
import {
  buildChartSeriesFromStats,
  buildDrillKpisForRegionFilter,
  buildSentimentPolarityFromStats,
} from "@/lib/analyticsDrillFromStats";
import { globalFiltersToReportsAnalytics } from "@/lib/globalFiltersToAnalytics";
import { useReportsAnalytics } from "@/hooks/useReportsAnalytics";
import { useResolvedWidgetFilters } from "@/hooks/useResolvedWidgetFilters";
import type { PanelWidget } from "@/types/customPanel";
import type { AnalyticsMetric, DrillGrain } from "@/types/analyticsDrill";

export function usePanelWidgetAnalytics(widget: PanelWidget) {
  const resolved = useResolvedWidgetFilters(widget.filters);
  const filters = useMemo(
    () => globalFiltersToReportsAnalytics(resolved.period, resolved.region, resolved.category),
    [resolved.period, resolved.region, resolved.category],
  );
  const { stats, isLoading } = useReportsAnalytics(filters);

  const bundle = useMemo(
    () => buildAnalyticsChartBundle(stats, resolved.period, resolved.region, resolved.category),
    [stats, resolved.period, resolved.region, resolved.category],
  );

  const kpis = useMemo(
    () => buildDrillKpisForRegionFilter(stats, resolved.region),
    [stats, resolved.region],
  );

  const chartSeries = (
    grain: DrillGrain,
    metric: AnalyticsMetric,
    activeRegion?: string,
    activeDistrict?: string,
  ) => buildChartSeriesFromStats(stats, grain, metric, activeRegion, activeDistrict);

  const sentimentPolarity = (grain: DrillGrain, activeRegion?: string, activeDistrict?: string) =>
    buildSentimentPolarityFromStats(stats, grain, activeRegion, activeDistrict);

  return {
    resolved,
    stats,
    bundle,
    kpis,
    isLoading,
    chartSeries,
    sentimentPolarity,
  };
}
