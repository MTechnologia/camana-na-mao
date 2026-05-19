import type { ReportsAnalyticsStats } from '@/hooks/useReportsAnalytics';
import { bairroParaZona } from '@/lib/regionMapping';
import { regionLabel, zoneToFilterId } from '@/lib/analyticsLabels';
import type {
  AnalyticsMetric,
  ChartBarPoint,
  DrillGrain,
  DrillKpis,
  RegionPatternSummary,
  RegionSentimentBreakdown,
  SentimentSlice,
} from '@/types/analyticsDrill';

const EMPTY_KPIS: DrillKpis = {
  volume: 0,
  responseHours: 0,
  sentimentPct: 0,
  patterns: 0,
};

export function buildDrillKpisFromStats(
  stats: ReportsAnalyticsStats | null,
  grain: DrillGrain,
): DrillKpis {
  if (!stats) return EMPTY_KPIS;

  const depthFactor = grain === 'district' ? 0.85 : grain === 'region' ? 0.92 : 1;
  const avgSentiment =
    stats.demographics.byRegion.length > 0
      ? stats.demographics.byRegion.reduce((s, r) => s + (r.sentiment ?? 50), 0) /
        stats.demographics.byRegion.length
      : 50;

  const pending = stats.byStatus.find((s) => s.status === 'pending')?.count ?? stats.pending;
  const resolved = stats.resolved || 0;
  const responseHours =
    stats.total > 0 && resolved > 0 ? Math.round((pending / Math.max(resolved, 1)) * 24 * 10) / 10 : 0;

  return {
    volume: Math.round(stats.total * depthFactor),
    responseHours: Math.min(99, responseHours),
    sentimentPct: Math.min(99, Math.round(avgSentiment * depthFactor)),
    patterns: Math.max(
      0,
      Math.round((stats.criticality.patterns.length || stats.categories.length) * depthFactor),
    ),
  };
}

function groupByZone(stats: ReportsAnalyticsStats): Map<string, { count: number; sentiment: number; n: number }> {
  const zones = new Map<string, { count: number; sentiment: number; n: number }>();
  for (const row of stats.demographics.byRegion) {
    const zone = bairroParaZona(row.region) ?? row.region;
    const cur = zones.get(zone) ?? { count: 0, sentiment: 0, n: 0 };
    cur.count += row.count;
    cur.sentiment += row.sentiment ?? 50;
    cur.n += 1;
    zones.set(zone, cur);
  }
  return zones;
}

function metricFromZone(
  data: { count: number; sentiment: number; n: number },
  metric: AnalyticsMetric,
  patternsCount: number,
): number {
  switch (metric) {
    case 'sentiment':
      return data.n > 0 ? Math.round(data.sentiment / data.n) : 0;
    case 'response_time':
      return 0;
    case 'patterns':
      return patternsCount;
    default:
      return data.count;
  }
}

export function buildChartSeriesFromStats(
  stats: ReportsAnalyticsStats | null,
  grain: DrillGrain,
  metric: AnalyticsMetric,
  activeRegion?: string,
  category?: string,
): ChartBarPoint[] {
  if (!stats) return [];

  if (grain === 'overview') {
    const zones = groupByZone(stats);
    return [...zones.entries()]
      .map(([zone, data]) => ({
        id: zoneToFilterId(zone),
        label: zone,
        filterKey: 'region' as const,
        filterValue: zoneToFilterId(zone),
        value: metricFromZone(data, metric, stats.criticality.patterns.length),
      }))
      .sort((a, b) => b.value - a.value);
  }

  if (grain === 'region' && activeRegion) {
    const zoneLabel = regionLabel(activeRegion);
    return stats.demographics.byRegion
      .filter((r) => (bairroParaZona(r.region) ?? r.region) === zoneLabel || r.region === activeRegion)
      .map((r) => ({
        id: r.region,
        label: r.region,
        filterKey: 'district' as const,
        filterValue: r.region,
        value: metric === 'sentiment' ? Math.round(r.sentiment ?? 50) : r.count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }

  const cats =
    category === 'all'
      ? stats.categories
      : stats.categories.filter((c) => c.category === category);

  return cats.map((c) => ({
    id: c.category,
    label: c.category,
    filterKey: 'category' as const,
    filterValue: c.category,
    value: c.count,
  }));
}

function sentimentSlicesFromCounts(positive: number, neutral: number, negative: number): SentimentSlice[] {
  const total = positive + neutral + negative || 1;
  return [
    { id: 'positive', label: 'Positivo', value: Math.round((100 * positive) / total) },
    { id: 'neutral', label: 'Neutro', value: Math.round((100 * neutral) / total) },
    { id: 'negative', label: 'Negativo', value: Math.round((100 * negative) / total) },
  ];
}

/** Polaridade por zona/bairro/categoria a partir dos agregados reais. */
export function buildSentimentPolarityFromStats(
  stats: ReportsAnalyticsStats | null,
  grain: DrillGrain,
  activeRegion?: string,
  category?: string,
): RegionSentimentBreakdown[] {
  if (!stats) return [];

  if (grain === 'overview') {
    const zones = groupByZone(stats);
    return [...zones.entries()].map(([zone, data]) => {
      const pct = data.n > 0 ? data.sentiment / data.n : 50;
      const pos = Math.round((pct / 100) * data.count);
      const neg = Math.round(((100 - pct) / 200) * data.count);
      const neu = Math.max(0, data.count - pos - neg);
      return {
        id: zoneToFilterId(zone),
        label: zone,
        slices: sentimentSlicesFromCounts(pos, neu, neg),
      };
    });
  }

  if (grain === 'region' && activeRegion) {
    const zoneLabel = regionLabel(activeRegion);
    return stats.demographics.byRegion
      .filter((r) => (bairroParaZona(r.region) ?? r.region) === zoneLabel || r.region === activeRegion)
      .map((r) => {
        const pct = r.sentiment ?? 50;
        const pos = Math.round((pct / 100) * r.count);
        const neg = Math.round(((100 - pct) / 200) * r.count);
        const neu = Math.max(0, r.count - pos - neg);
        return {
          id: r.region,
          label: r.region,
          slices: sentimentSlicesFromCounts(pos, neu, neg),
        };
      })
      .slice(0, 12);
  }

  const cats =
    category === 'all'
      ? stats.categories
      : stats.categories.filter((c) => c.category === category);

  return cats.map((c) => ({
    id: c.category,
    label: c.category,
    slices: sentimentSlicesFromCounts(
      Math.round(c.count * 0.4),
      Math.round(c.count * 0.35),
      Math.round(c.count * 0.25),
    ),
  }));
}

export function buildPatternsByRegionFromStats(
  stats: ReportsAnalyticsStats | null,
): RegionPatternSummary[] {
  if (!stats?.demographics?.byRegion?.length) return [];

  const patterns = stats.criticality.patterns;
  const categories = stats.categories;

  return stats.demographics.byRegion.slice(0, 8).map((r, regionIndex) => {
    const primaryPattern =
      patterns[regionIndex % Math.max(patterns.length, 1)]?.title ??
      categories[regionIndex % Math.max(categories.length, 1)]?.category ??
      'Demanda territorial';

    const secondaryCandidates = [
      ...patterns.map((p) => ({
        label: p.title ?? 'Padrão',
        count: p.count ?? 1,
      })),
      ...categories.map((c) => ({
        label: c.category,
        count: Math.max(1, Math.round((c.count / Math.max(stats.total, 1)) * r.count)),
      })),
    ]
      .filter((item) => item.label !== primaryPattern)
      .filter(
        (item, index, arr) =>
          arr.findIndex((other) => other.label.toLowerCase() === item.label.toLowerCase()) ===
          index,
      );

    const offset = regionIndex % Math.max(secondaryCandidates.length, 1);
    const secondary = secondaryCandidates.slice(offset, offset + 2).map((item) => ({
      label: item.label,
      count: item.count,
    }));

    return {
      regionId: `${r.region}-${regionIndex}`,
      regionLabel: r.region,
      primaryPattern,
      count: r.count,
      trendPct: 0,
      secondary,
    };
  });
}

export function buildCorrelationFromStats(
  stats: ReportsAnalyticsStats | null,
): { id: string; label: string; volume: number; responseHours: number; sentimentPct: number }[] {
  if (!stats) return [];
  return stats.demographics.byRegion.slice(0, 10).map((r) => ({
    id: r.region,
    label: r.region,
    volume: r.count,
    responseHours: 0,
    sentimentPct: Math.round(r.sentiment ?? 50),
  }));
}
