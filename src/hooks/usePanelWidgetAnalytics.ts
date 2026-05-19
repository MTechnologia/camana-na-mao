import { useMemo } from 'react';
import { buildAnalyticsChartBundle } from '@/lib/analyticsFromStats';
import { buildChartSeriesFromStats, buildDrillKpisFromStats, buildSentimentPolarityFromStats } from '@/lib/analyticsDrillFromStats';
import { globalFiltersToReportsAnalytics } from '@/lib/globalFiltersToAnalytics';
import { useReportsAnalytics } from '@/hooks/useReportsAnalytics';
import { useResolvedWidgetFilters } from '@/hooks/useResolvedWidgetFilters';
import type { PanelWidget } from '@/types/customPanel';
import type { AnalyticsMetric, DrillGrain } from '@/types/analyticsDrill';

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

  const kpis = useMemo(() => buildDrillKpisFromStats(stats, 'overview'), [stats]);

  const chartSeries = (grain: DrillGrain, metric: AnalyticsMetric, activeRegion?: string) =>
    buildChartSeriesFromStats(stats, grain, metric, activeRegion, resolved.category);

  const sentimentPolarity = (grain: DrillGrain, activeRegion?: string) =>
    buildSentimentPolarityFromStats(stats, grain, activeRegion, resolved.category);

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
