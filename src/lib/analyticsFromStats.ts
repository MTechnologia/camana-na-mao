import type { ReportsAnalyticsStats } from '@/hooks/useReportsAnalytics';
import type {
  ChartBarPoint,
  DrillGrain,
  DrillKpis,
  PatternRankRow,
  RegionPatternSummary,
  RegionSentimentBreakdown,
  TerritoryIntensity,
  TimeSeriesPoint,
} from '@/types/analyticsDrill';
import {
  buildDrillKpisForRegionFilter,
  buildCorrelationFromStats,
  buildPatternsByRegionFromStats,
  buildSentimentPolarityFromStats,
} from '@/lib/analyticsDrillFromStats';
import { formatReportCategoryLabel } from '@/lib/reportCategoryLabels';
import { formatTimelineDayLabel, patternRankFromAlerts } from '@/lib/reportsAnalyticsAggregates';

const emptyKpis: DrillKpis = {
  volume: 0,
  responseHours: 0,
  sentimentPct: null,
  patterns: 0,
};

/** Agrega dados reais do Supabase para gráficos da análise urbanos. */
export function buildAnalyticsChartBundle(
  stats: ReportsAnalyticsStats | null,
  period: string,
  region: string,
  category: string,
) {
  const kpis: DrillKpis = stats ? buildDrillKpisForRegionFilter(stats, region) : emptyKpis;

  const volumeTimeSeries: TimeSeriesPoint[] = stats?.timeline?.length
    ? stats.timeline.map((p) => ({
        label: formatTimelineDayLabel(p.date),
        volume: p.total,
        resolved: p.resolved ?? 0,
      }))
    : stats && stats.total > 0
      ? [
          {
            label: 'Total no período',
            volume: stats.total,
            resolved: stats.resolved,
          },
        ]
      : [];

  const volumeByCategory: ChartBarPoint[] = stats?.categories?.length
    ? stats.categories.map((c) => ({
        id: c.category,
        label: formatReportCategoryLabel(c.category),
        filterKey: 'category' as const,
        filterValue: c.category,
        value: c.count,
      }))
    : [];

  const territoryIntensity: TerritoryIntensity[] = stats?.demographics?.byRegion?.length
    ? stats.demographics.byRegion.map((r) => ({
        id: r.region,
        label: r.region,
        volume: r.count,
        intensity: r.count,
      }))
    : [];

  const statusBreakdown = stats?.byStatus?.length
    ? stats.byStatus.map((s) => ({
        id: s.status,
        label: s.status,
        value: s.count,
      }))
    : [];

  const sentimentGrain: DrillGrain = region === 'all' ? 'overview' : 'region';
  const sentimentByRegion: RegionSentimentBreakdown[] = buildSentimentPolarityFromStats(
    stats,
    sentimentGrain,
    region === 'all' ? undefined : region,
  );

  const topPatterns: PatternRankRow[] = stats?.criticality?.patterns?.length
    ? patternRankFromAlerts(stats.criticality.patterns)
    : [];

  const patternsByRegion: RegionPatternSummary[] =
    stats?.territoryPatterns?.length
      ? stats.territoryPatterns
      : buildPatternsByRegionFromStats(stats, region === 'all' ? undefined : region);
  const correlationPoints = buildCorrelationFromStats(stats);

  void period;

  return {
    kpis,
    volumeTimeSeries,
    volumeByCategory,
    sentimentByRegion,
    topPatterns,
    patternsByRegion,
    correlationPoints,
    territoryIntensity,
    statusBreakdown,
  };
}
