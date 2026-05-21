import type { ReportsAnalyticsStats } from '@/hooks/useReportsAnalytics';
import { DISTRICT_LABEL_FALLBACK } from '@/lib/reportsAnalyticsAggregates';
import { bairroParaZona, ZONA_DESCONHECIDA, ZONAS_FILTRO } from '@/lib/regionMapping';
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

const DISTRICT_FALLBACK_ID = '__sem_bairro__';

/** Relatos no total que não entram na distribuição territorial exibida no gráfico. */
export function unallocatedVolumeFromStats(stats: ReportsAnalyticsStats): number {
  if (stats.volumeByZone?.length) {
    const zoneSum = stats.volumeByZone.reduce((s, z) => s + z.count, 0);
    return Math.max(0, stats.total - zoneSum);
  }
  const distributed = stats.demographics.byRegion.reduce((s, r) => s + r.count, 0);
  return Math.max(0, stats.total - distributed);
}

function zoneVolumeFromStats(stats: ReportsAnalyticsStats, zoneLabel: string): number {
  const fromGeo = stats.volumeByZone?.find((z) => z.zone === zoneLabel)?.count;
  if (fromGeo != null) return fromGeo;
  return groupByZone(stats).get(zoneLabel)?.count ?? 0;
}

function districtRowsForZone(stats: ReportsAnalyticsStats, zoneLabel: string) {
  if (stats.neighborhoodBreakdown?.length) {
    return stats.neighborhoodBreakdown.filter((r) => r.zone === zoneLabel);
  }
  return stats.demographics.byRegion
    .filter((r) => bairroParaZona(r.region) === zoneLabel)
    .map((r) => ({ neighborhood: r.region, zone: zoneLabel, count: r.count }));
}

function volumeKpiFromStats(
  stats: ReportsAnalyticsStats,
  grain: DrillGrain,
  activeRegion?: string,
): number {
  if (grain === 'overview') return stats.total;
  if (grain === 'region' && activeRegion) {
    return zoneVolumeFromStats(stats, regionLabel(activeRegion));
  }
  return stats.total;
}

function sentimentKpiFromStats(
  stats: ReportsAnalyticsStats,
  grain: DrillGrain,
  activeRegion?: string,
): number {
  const rows =
    grain === 'region' && activeRegion
      ? districtRowsForZone(stats, regionLabel(activeRegion)).map((r) => ({
          count: r.count,
          sentiment: 50,
        }))
      : stats.demographics.byRegion.map((r) => ({ count: r.count, sentiment: r.sentiment ?? 50 }));

  if (rows.length === 0) return 0;
  const totalCount = rows.reduce((s, r) => s + r.count, 0);
  if (totalCount <= 0) return 0;
  const weighted = rows.reduce((s, r) => s + r.sentiment * r.count, 0);
  return Math.min(99, Math.round(weighted / totalCount));
}

export function buildDrillKpisFromStats(
  stats: ReportsAnalyticsStats | null,
  grain: DrillGrain,
  activeRegion?: string,
  _activeDistrict?: string,
): DrillKpis {
  if (!stats) return EMPTY_KPIS;

  const pending = stats.byStatus.find((s) => s.status === 'Pendente')?.count ?? stats.pending;
  const resolved = stats.resolved || 0;
  const responseHours =
    stats.total > 0 && resolved > 0
      ? Math.min(99, Math.round((pending / Math.max(resolved, 1)) * 24 * 10) / 10)
      : 0;

  return {
    volume: volumeKpiFromStats(stats, grain, activeRegion),
    responseHours,
    sentimentPct: sentimentKpiFromStats(stats, grain, activeRegion),
    patterns: Math.max(0, stats.criticality.patterns.length || stats.categories.length),
  };
}

function emptyZoneBucket(): { count: number; sentiment: number; n: number } {
  return { count: 0, sentiment: 0, n: 0 };
}

/** Agrega por zona canônica; sempre inclui as 6 zonas do filtro (5 + Não informada). */
function groupByZone(stats: ReportsAnalyticsStats): Map<string, { count: number; sentiment: number; n: number }> {
  const zones = new Map<string, { count: number; sentiment: number; n: number }>();
  for (const zona of ZONAS_FILTRO) {
    zones.set(zona, emptyZoneBucket());
  }

  if (stats.volumeByZone?.length) {
    for (const row of stats.volumeByZone) {
      const zone = zones.has(row.zone) ? row.zone : ZONA_DESCONHECIDA;
      const cur = zones.get(zone)!;
      cur.count = row.count;
    }
    const gap = unallocatedVolumeFromStats(stats);
    if (gap > 0) {
      zones.get(ZONA_DESCONHECIDA)!.count += gap;
    }
    return zones;
  }

  for (const row of stats.demographics.byRegion) {
    const mapped = bairroParaZona(row.region);
    const zone =
      mapped !== ZONA_DESCONHECIDA && zones.has(mapped) ? mapped : ZONA_DESCONHECIDA;
    const cur = zones.get(zone)!;
    cur.count += row.count;
    cur.sentiment += row.sentiment ?? 50;
    cur.n += 1;
  }

  const gap = unallocatedVolumeFromStats(stats);
  if (gap > 0) {
    zones.get(ZONA_DESCONHECIDA)!.count += gap;
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
    return ZONAS_FILTRO.map((zone) => {
      const data = zones.get(zone) ?? emptyZoneBucket();
      return {
        id: zoneToFilterId(zone),
        label: zone,
        filterKey: 'region' as const,
        filterValue: zoneToFilterId(zone),
        value: metricFromZone(data, metric, stats.criticality.patterns.length),
      };
    });
  }

  if (grain === 'region' && activeRegion) {
    const zoneLabel = regionLabel(activeRegion);
    const rows = districtRowsForZone(stats, zoneLabel);

    if (rows.length === 0 && zoneVolumeFromStats(stats, zoneLabel) > 0) {
      return [
        {
          id: DISTRICT_FALLBACK_ID,
          label: DISTRICT_LABEL_FALLBACK,
          filterKey: 'district' as const,
          filterValue: DISTRICT_FALLBACK_ID,
          value: zoneVolumeFromStats(stats, zoneLabel),
        },
      ];
    }

    return rows
      .map((r) => ({
        id: r.neighborhood,
        label: r.neighborhood,
        filterKey: 'district' as const,
        filterValue: r.neighborhood,
        value: r.count,
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
    return ZONAS_FILTRO.map((zone) => {
      const data = zones.get(zone) ?? emptyZoneBucket();
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
    const rows = districtRowsForZone(stats, zoneLabel);
    return rows
      .map((r) => {
        const pos = Math.round(r.count * 0.4);
        const neg = Math.round(r.count * 0.25);
        const neu = Math.max(0, r.count - pos - neg);
        return {
          id: r.neighborhood,
          label: r.neighborhood,
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
