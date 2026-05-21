import type { ReportsAnalyticsStats } from '@/hooks/useReportsAnalytics';
import type {
  ChartBarPoint,
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
import { formatTimelineDayLabel } from '@/lib/reportsAnalyticsAggregates';

const emptyKpis: DrillKpis = {
  volume: 0,
  responseHours: 0,
  sentimentPct: 0,
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

  const resolvedRatio =
    stats && stats.total > 0 ? stats.resolved / stats.total : 0;
  const volumeTimeSeries: TimeSeriesPoint[] = stats?.timeline?.length
    ? stats.timeline.map((p) => ({
        label: formatTimelineDayLabel(p.date),
        volume: p.total,
        resolved: p.resolved ?? Math.round(p.total * resolvedRatio),
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
        label: c.category,
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

  const sentimentByRegion: RegionSentimentBreakdown[] = buildSentimentPolarityFromStats(
    stats,
    'overview',
    region === 'all' ? undefined : region,
    category,
  );

  const topPatterns: PatternRankRow[] = stats?.criticality?.patterns?.length
    ? stats.criticality.patterns.map((p, i) => ({
        id: p.id ?? `pattern-${i}`,
        label: p.title ?? 'Padrão',
        count: p.count ?? 1,
        trendPct: 0,
      }))
    : [];

  const patternsByRegion: RegionPatternSummary[] = buildPatternsByRegionFromStats(stats);
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
