import type { ReportsAnalyticsStats } from '@/hooks/useReportsAnalytics';
import { regionLabel, zoneToFilterId } from '@/lib/analyticsLabels';
import {
  countRecurringThemesFromCategories,
  DISTRICT_FALLBACK_ID,
  DISTRICT_LABEL_FALLBACK,
  districtVolumeFromBreakdown,
  STREET_FALLBACK_ID,
  STREET_LABEL_FALLBACK,
  streetRowsForDistrict,
  territoryLabelsMatch,
} from '@/lib/reportsAnalyticsAggregates';
import { bairroParaZona, ZONA_DESCONHECIDA, ZONAS_FILTRO } from '@/lib/regionMapping';
import { formatReportCategoryLabel } from '@/lib/reportCategoryLabels';
import { EMPTY_RESPONSE_TIME_DRILL } from '@/lib/responseTimeAggregates';
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
  sentimentPct: null,
  patterns: 0,
};

const SENTIMENT_PLACEHOLDER_PCT = 50;

/** Total no mesmo universo dos gráficos territoriais (amostra urbana geolocalizada). */
export function territorialVolumeTotal(stats: ReportsAnalyticsStats): number {
  if (stats.volumeByZone?.length) {
    return stats.volumeByZone.reduce((s, z) => s + z.count, 0);
  }
  return stats.urban;
}

function sentimentDataIsPlaceholder(stats: ReportsAnalyticsStats): boolean {
  if (stats.volumeByZone?.length) return true;
  const rows = stats.demographics.byRegion;
  if (rows.length === 0) return true;
  return rows.every((r) => (r.sentiment ?? SENTIMENT_PLACEHOLDER_PCT) === SENTIMENT_PLACEHOLDER_PCT);
}

/** Relatos no total que não entram na distribuição territorial exibida no gráfico. */
export function unallocatedVolumeFromStats(stats: ReportsAnalyticsStats): number {
  const universe = territorialVolumeTotal(stats);
  if (stats.volumeByZone?.length) {
    const zoneSum = stats.volumeByZone.reduce((s, z) => s + z.count, 0);
    return Math.max(0, universe - zoneSum);
  }
  const distributed = stats.demographics.byRegion.reduce((s, r) => s + r.count, 0);
  return Math.max(0, universe - distributed);
}

function zoneVolumeFromStats(stats: ReportsAnalyticsStats, zoneLabel: string): number {
  const fromGeo = stats.volumeByZone?.find((z) => z.zone === zoneLabel)?.count;
  if (fromGeo != null) return fromGeo;
  return stats.demographics.byRegion
    .filter((r) => bairroParaZona(r.region) === zoneLabel)
    .reduce((s, r) => s + r.count, 0);
}

function districtRowsForZone(stats: ReportsAnalyticsStats, zoneLabel: string) {
  if (stats.neighborhoodBreakdown?.length) {
    return stats.neighborhoodBreakdown.filter((r) => r.zone === zoneLabel);
  }
  return stats.demographics.byRegion
    .filter((r) => bairroParaZona(r.region) === zoneLabel)
    .map((r) => ({ neighborhood: r.region, zone: zoneLabel, count: r.count }));
}

function districtRowsFromStreetBreakdown(
  stats: ReportsAnalyticsStats,
  zoneLabel: string,
): { neighborhood: string; zone: string; count: number }[] {
  const byDistrict = new Map<string, number>();
  for (const row of stats.streetBreakdown ?? []) {
    if (row.zone !== zoneLabel) continue;
    byDistrict.set(row.neighborhood, (byDistrict.get(row.neighborhood) ?? 0) + row.count);
  }
  return Array.from(byDistrict.entries()).map(([neighborhood, count]) => ({
    neighborhood,
    zone: zoneLabel,
    count,
  }));
}

function volumeKpiFromStats(
  stats: ReportsAnalyticsStats,
  grain: DrillGrain,
  activeRegion?: string,
  activeDistrict?: string,
): number {
  if (grain === 'overview') return territorialVolumeTotal(stats);

  if (grain === 'region' && activeRegion) {
    return zoneVolumeFromStats(stats, regionLabel(activeRegion));
  }

  if (grain === 'street' && activeRegion && activeDistrict) {
    const zoneLabel = regionLabel(activeRegion);
    const rows = streetRowsForDistrict(stats.streetBreakdown ?? [], zoneLabel, activeDistrict);
    if (rows.length > 0) return rows.reduce((s, r) => s + r.count, 0);
    return districtVolumeFromBreakdown(stats.neighborhoodBreakdown, zoneLabel, activeDistrict);
  }

  return stats.total;
}

function sentimentKpiFromStats(
  stats: ReportsAnalyticsStats,
  grain: DrillGrain,
  activeRegion?: string,
  activeDistrict?: string,
): number | null {
  if (sentimentDataIsPlaceholder(stats)) return null;

  const rows =
    grain === 'street' && activeRegion && activeDistrict
      ? streetRowsForDistrict(stats.streetBreakdown ?? [], regionLabel(activeRegion), activeDistrict).map(
          (r) => ({ region: r.street, count: r.count, sentiment: 50 }),
        )
      : grain === 'region' && activeRegion
        ? districtRowsForZone(stats, regionLabel(activeRegion)).map((r) => ({
            region: r.neighborhood,
            count: r.count,
            sentiment: 50,
          }))
        : stats.demographics.byRegion;

  if (rows.length === 0) return 0;
  const totalCount = rows.reduce((s, r) => s + r.count, 0);
  if (totalCount <= 0) return 0;
  const weighted = rows.reduce((s, r) => s + (r.sentiment ?? 50) * r.count, 0);
  return Math.min(99, Math.round(weighted / totalCount));
}

function avgHoursForZoneFromRt(
  rt: NonNullable<ReportsAnalyticsStats['responseTime']>,
  zoneLabel: string,
): number {
  const zoneRow = rt.byZone.find((z) => z.zone === zoneLabel);
  if (zoneRow && zoneRow.count > 0) return zoneRow.avgHours;
  const districts = rt.byNeighborhood.filter((r) => r.zone === zoneLabel && r.count > 0);
  if (districts.length === 0) return 0;
  const total = districts.reduce((s, r) => s + r.count, 0);
  const weighted = districts.reduce((s, r) => s + r.avgHours * r.count, 0);
  return total > 0 ? Math.round((weighted / total) * 10) / 10 : 0;
}

function avgHoursForDistrictFromRt(
  rt: NonNullable<ReportsAnalyticsStats['responseTime']>,
  zoneLabel: string,
  neighborhood: string,
): number {
  const row = rt.byNeighborhood.find(
    (r) => r.zone === zoneLabel && territoryLabelsMatch(r.neighborhood, neighborhood) && r.count > 0,
  );
  return row?.avgHours ?? 0;
}

function responseTimeKpiFromStats(
  stats: ReportsAnalyticsStats,
  grain: DrillGrain,
  activeRegion?: string,
  activeDistrict?: string,
): number {
  const rt = stats.responseTime ?? EMPTY_RESPONSE_TIME_DRILL;
  if (grain === 'street' && activeRegion && activeDistrict) {
    return avgHoursForDistrictFromRt(rt, regionLabel(activeRegion), activeDistrict);
  }
  if (grain === 'region' && activeRegion) {
    return avgHoursForZoneFromRt(rt, regionLabel(activeRegion));
  }
  return rt.avgHours;
}

/** KPIs alinhados ao filtro de região (overview = total do RPC; região = volume territorial). */
export function buildDrillKpisForRegionFilter(
  stats: ReportsAnalyticsStats | null,
  region: string,
): DrillKpis {
  if (!region || region === 'all') {
    return buildDrillKpisFromStats(stats, 'overview');
  }
  return buildDrillKpisFromStats(stats, 'region', region);
}

export function buildDrillKpisFromStats(
  stats: ReportsAnalyticsStats | null,
  grain: DrillGrain,
  activeRegion?: string,
  activeDistrict?: string,
): DrillKpis {
  if (!stats) return EMPTY_KPIS;

  const patternsCount = countRecurringThemesFromCategories(stats.categories);

  return {
    volume: volumeKpiFromStats(stats, grain, activeRegion, activeDistrict),
    responseHours: responseTimeKpiFromStats(stats, grain, activeRegion, activeDistrict),
    sentimentPct: sentimentKpiFromStats(stats, grain, activeRegion, activeDistrict),
    patterns: Math.max(0, patternsCount),
  };
}

function emptyZoneBucket(): { count: number; sentiment: number; n: number } {
  return { count: 0, sentiment: 0, n: 0 };
}

/** Agrega por zona canônica da capital; sempre inclui as 6 zonas do filtro (5 + Não informada). */
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
      const cur = zones.get(ZONA_DESCONHECIDA)!;
      cur.count += gap;
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
    const cur = zones.get(ZONA_DESCONHECIDA)!;
    cur.count += gap;
  }

  return zones;
}

function responseHoursForZone(stats: ReportsAnalyticsStats, zone: string): number {
  const rt = stats.responseTime ?? EMPTY_RESPONSE_TIME_DRILL;
  return avgHoursForZoneFromRt(rt, zone);
}

function metricFromZone(
  data: { count: number; sentiment: number; n: number },
  metric: AnalyticsMetric,
  patternsCount: number,
  stats: ReportsAnalyticsStats,
  zone: string,
): number {
  switch (metric) {
    case 'sentiment':
      return data.n > 0 ? Math.round(data.sentiment / data.n) : 0;
    case 'response_time':
      return responseHoursForZone(stats, zone);
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

function streetIdFromLabel(label: string): string {
  if (label === STREET_LABEL_FALLBACK) return STREET_FALLBACK_ID;
  return label;
}

export function buildChartSeriesFromStats(
  stats: ReportsAnalyticsStats | null,
  grain: DrillGrain,
  metric: AnalyticsMetric,
  activeRegion?: string,
  activeDistrict?: string,
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
        value: metricFromZone(data, metric, stats.criticality.patterns.length, stats, zone),
      };
    });
  }

  if (grain === 'region' && activeRegion) {
    const zoneLabel = regionLabel(activeRegion);

    if (metric === 'response_time') {
      const rtRows = (stats.responseTime ?? EMPTY_RESPONSE_TIME_DRILL).byNeighborhood.filter(
        (r) => r.zone === zoneLabel && r.count > 0,
      );
      if (rtRows.length === 0 && responseHoursForZone(stats, zoneLabel) > 0) {
        return [
          {
            id: DISTRICT_FALLBACK_ID,
            label: DISTRICT_LABEL_FALLBACK,
            filterKey: 'district' as const,
            filterValue: DISTRICT_FALLBACK_ID,
            value: responseHoursForZone(stats, zoneLabel),
          },
        ];
      }
      return rtRows
        .map((r) => ({
          id: r.neighborhood,
          label: r.neighborhood,
          filterKey: 'district' as const,
          filterValue: r.neighborhood,
          value: r.avgHours,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 12);
    }

    const streetDerivedRows = districtRowsFromStreetBreakdown(stats, zoneLabel);
    const rows = streetDerivedRows.length > 0
      ? streetDerivedRows
      : districtRowsForZone(stats, zoneLabel);
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

  if (grain === 'street' && activeRegion && activeDistrict) {
    const zoneLabel = regionLabel(activeRegion);
    const districtHours = avgHoursForDistrictFromRt(
      stats.responseTime ?? EMPTY_RESPONSE_TIME_DRILL,
      zoneLabel,
      activeDistrict,
    );
    const rows = streetRowsForDistrict(stats.streetBreakdown ?? [], zoneLabel, activeDistrict);

    if (metric === 'response_time') {
      if (rows.length === 0 && districtHours > 0) {
        return [
          {
            id: STREET_FALLBACK_ID,
            label: STREET_LABEL_FALLBACK,
            filterKey: 'street' as const,
            filterValue: STREET_FALLBACK_ID,
            value: districtHours,
          },
        ];
      }
      return rows
        .map((r) => ({
          id: streetIdFromLabel(r.street),
          label: r.street,
          filterKey: 'street' as const,
          filterValue: streetIdFromLabel(r.street),
          value: districtHours,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 12);
    }

    if (rows.length === 0) {
      const fallbackVol = districtVolumeFromBreakdown(
        stats.neighborhoodBreakdown,
        zoneLabel,
        activeDistrict,
      );
      if (fallbackVol > 0) {
        return [
          {
            id: STREET_FALLBACK_ID,
            label: STREET_LABEL_FALLBACK,
            filterKey: 'street' as const,
            filterValue: STREET_FALLBACK_ID,
            value: fallbackVol,
          },
        ];
      }
      return [];
    }

    return rows
      .map((r) => ({
        id: streetIdFromLabel(r.street),
        label: r.street,
        filterKey: 'street' as const,
        filterValue: streetIdFromLabel(r.street),
        value: r.count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }

  return [];
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
  activeDistrict?: string,
): RegionSentimentBreakdown[] {
  if (!stats || sentimentDataIsPlaceholder(stats)) return [];

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
    return districtRowsForZone(stats, zoneLabel)
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

  if (grain === 'street' && activeRegion && activeDistrict) {
    return streetRowsForDistrict(
      stats.streetBreakdown ?? [],
      regionLabel(activeRegion),
      activeDistrict,
    )
      .map((r) => {
        const pos = Math.round(r.count * 0.4);
        const neg = Math.round(r.count * 0.25);
        const neu = Math.max(0, r.count - pos - neg);
        return {
          id: streetIdFromLabel(r.street),
          label: r.street,
          slices: sentimentSlicesFromCounts(pos, neu, neg),
        };
      })
      .slice(0, 12);
  }

  return [];
}

/** Fallback quando territoryPatterns ainda não foi calculado no hook. */
export function buildPatternsByRegionFromStats(
  stats: ReportsAnalyticsStats | null,
  activeRegion?: string,
): RegionPatternSummary[] {
  if (!stats) return [];

  const topLabel =
    stats.criticality.patterns[0]?.title ??
    (stats.categories[0]
      ? formatReportCategoryLabel(stats.categories[0].category)
      : 'Sem tema dominante');

  let rows = stats.demographics.byRegion;
  if (activeRegion) {
    const zoneLabel = regionLabel(activeRegion);
    rows = rows.filter((r) => bairroParaZona(r.region) === zoneLabel);
  }

  if (!rows.length && stats.neighborhoodBreakdown?.length) {
    return stats.neighborhoodBreakdown.slice(0, 8).map((r) => ({
      regionId: r.neighborhood,
      regionLabel: r.neighborhood,
      primaryPattern: topLabel,
      count: r.count,
      trendPct: 0,
      secondary: stats.categories.slice(1, 3).map((c) => ({
        label: formatReportCategoryLabel(c.category),
        count: c.count,
      })),
    }));
  }

  return rows.slice(0, 8).map((r) => ({
    regionId: r.region,
    regionLabel: r.region,
    primaryPattern: topLabel,
    count: r.count,
    trendPct: 0,
    secondary: stats.categories.slice(1, 3).map((c) => ({
      label: formatReportCategoryLabel(c.category),
      count: c.count,
    })),
  }));
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
