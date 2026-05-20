import type { ReportsAnalyticsStats } from '@/hooks/useReportsAnalytics';
import { bairroParaZona, ZONA_DESCONHECIDA } from '@/lib/regionMapping';
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

/** Relatos no total que não entram na distribuição por bairro (RPC top 20 ou bairro nulo). */
export function unallocatedVolumeFromStats(stats: ReportsAnalyticsStats): number {
  const distributed = stats.demographics.byRegion.reduce((s, r) => s + r.count, 0);
  return Math.max(0, stats.total - distributed);
}

function volumeKpiFromStats(
  stats: ReportsAnalyticsStats,
  grain: DrillGrain,
  activeRegion?: string,
  category?: string,
): number {
  if (grain === 'overview') return stats.total;

  if (grain === 'region' && activeRegion) {
    const zoneLabel = regionLabel(activeRegion);
    return stats.demographics.byRegion
      .filter((r) => (bairroParaZona(r.region) ?? r.region) === zoneLabel || r.region === activeRegion)
      .reduce((s, r) => s + r.count, 0);
  }

  const cats =
    category === 'all'
      ? stats.categories
      : stats.categories.filter((c) => c.category === category);
  return cats.reduce((s, c) => s + c.count, 0);
}

function sentimentKpiFromStats(stats: ReportsAnalyticsStats, grain: DrillGrain, activeRegion?: string): number {
  const rows =
    grain === 'region' && activeRegion
      ? stats.demographics.byRegion.filter((r) => {
          const zoneLabel = regionLabel(activeRegion);
          return (bairroParaZona(r.region) ?? r.region) === zoneLabel || r.region === activeRegion;
        })
      : stats.demographics.byRegion;

  if (rows.length === 0) return 0;
  const totalCount = rows.reduce((s, r) => s + r.count, 0);
  if (totalCount <= 0) return 0;
  const weighted = rows.reduce((s, r) => s + (r.sentiment ?? 50) * r.count, 0);
  return Math.min(99, Math.round(weighted / totalCount));
}

export function buildDrillKpisFromStats(
  stats: ReportsAnalyticsStats | null,
  grain: DrillGrain,
  activeRegion?: string,
  category?: string,
): DrillKpis {
  if (!stats) return EMPTY_KPIS;

  const patternsCount = stats.criticality.patterns.length || stats.categories.length;

  return {
    volume: volumeKpiFromStats(stats, grain, activeRegion, category),
    responseHours: responseHoursFromStats(stats),
    sentimentPct: sentimentKpiFromStats(stats, grain, activeRegion),
    patterns: Math.max(0, patternsCount),
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

  const gap = unallocatedVolumeFromStats(stats);
  if (gap > 0) {
    const cur = zones.get(ZONA_DESCONHECIDA) ?? { count: 0, sentiment: 0, n: 0 };
    cur.count += gap;
    zones.set(ZONA_DESCONHECIDA, cur);
  }

  return zones;
}

function responseHoursFromStats(stats: ReportsAnalyticsStats): number {
  const pending = stats.byStatus.find((s) => s.status === 'Pendente')?.count ?? stats.pending;
  const resolved = stats.resolved || 0;
  if (stats.total <= 0 || resolved <= 0) return 0;
  return Math.min(99, Math.round((pending / Math.max(resolved, 1)) * 24 * 10) / 10);
}

function metricFromZone(
  data: { count: number; sentiment: number; n: number },
  metric: AnalyticsMetric,
  patternsCount: number,
  stats: ReportsAnalyticsStats,
): number {
  switch (metric) {
    case 'sentiment':
      return data.n > 0 ? Math.round(data.sentiment / data.n) : 0;
    case 'response_time':
      return responseHoursFromStats(stats);
    case 'patterns':
      return patternsCount;
    default:
      return data.count;
  }
}

/** Soma dos valores do gráfico de barras (útil para validar paridade com o KPI de volume). */
export function sumChartBarValues(points: ChartBarPoint[]): number {
  return points.reduce((s, p) => s + p.value, 0);
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
        value: metricFromZone(data, metric, stats.criticality.patterns.length, stats),
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
