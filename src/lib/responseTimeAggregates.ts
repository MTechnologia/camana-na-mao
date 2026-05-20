import { supabase } from '@/integrations/supabase/client';
import type { ReportsAnalyticsFilters } from '@/hooks/useReportsAnalytics';
import {
  categoryDbValuesForRpc,
  resolveGlobalCategoryFilter,
} from '@/lib/globalCategoryFilter';
import { regionLabel } from '@/lib/analyticsLabels';
import { normalizeCitizenReportStatus } from '@/lib/citizenReportStatus';
import {
  bairroParaZona,
  ZONAS_FILTRO,
  type ZonaVolumeOuDesconhecida,
} from '@/lib/regionMapping';
import {
  districtLabelFromGeoRow,
  type GeoReportRow,
  type TerritoryGeoRow,
  type UrbanReportRow,
} from '@/lib/reportsAnalyticsAggregates';

const PAGE_SIZE = 1000;
const MAX_PAGES = 5;

export type ResponseTimeRecord = {
  source: 'urbano' | 'transporte' | 'encaminhamento';
  category: string;
  /** Tipo principal do relato de transporte (ex.: atraso). */
  reportType?: string;
  neighborhood: string;
  zone: ZonaVolumeOuDesconhecida;
  hours: number;
  createdAt: string;
  closedAt: string;
};

export type ResponseTimeZoneRow = {
  zone: ZonaVolumeOuDesconhecida;
  avgHours: number;
  count: number;
};

export type ResponseTimeDistrictRow = {
  neighborhood: string;
  zone: ZonaVolumeOuDesconhecida;
  avgHours: number;
  count: number;
};

export type ResponseTimeCategoryRow = {
  category: string;
  avgHours: number;
  count: number;
};

export type ResponseTimeDrillStats = {
  avgHours: number;
  resolvedCount: number;
  byZone: ResponseTimeZoneRow[];
  byNeighborhood: ResponseTimeDistrictRow[];
  byCategory: ResponseTimeCategoryRow[];
};

export const EMPTY_RESPONSE_TIME_DRILL: ResponseTimeDrillStats = {
  avgHours: 0,
  resolvedCount: 0,
  byZone: ZONAS_FILTRO.map((zone) => ({ zone, avgHours: 0, count: 0 })),
  byNeighborhood: [],
  byCategory: [],
};

function diffHours(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms > 0 ? ms / 36e5 : 0;
}

function safeText(value: unknown, fallback = 'Não informado'): string {
  const text = (value as string | null | undefined)?.toString().trim();
  return text && text.length > 0 ? text : fallback;
}

function normalizeDistrictKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCategory(value: string): string {
  return normalizeDistrictKey(value);
}

function zoneFromGeoRow(row: GeoReportRow): ZonaVolumeOuDesconhecida {
  const text = [row.neighborhood, row.location].filter(Boolean).join(' ');
  return bairroParaZona(text, row.latitude, row.longitude);
}

function triageMapKey(sourceTable: string, reportId: string): string {
  return `${sourceTable}:${reportId}`;
}

function isResolvedReportStatus(status: string | null | undefined): boolean {
  return normalizeCitizenReportStatus(status) === 'resolved';
}

/** Mapa report_triage.resolved_at por (source_table, report_id). */
export async function fetchTriageResolvedAtMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const { data, error } = await supabase
        .from('report_triage')
        .select('source_table, report_id, resolved_at')
        .not('resolved_at', 'is', null)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      const rows = data ?? [];
      for (const row of rows) {
        if (!row.source_table || !row.report_id || !row.resolved_at) continue;
        map.set(triageMapKey(row.source_table, row.report_id), row.resolved_at);
      }
      if (rows.length < PAGE_SIZE) break;
    }
  } catch (err) {
    console.warn('[fetchTriageResolvedAtMap]', err);
  }
  return map;
}

/**
 * Tempo médio a partir das MESMAS linhas geográficas do gráfico de volume
 * (apenas relatos resolvidos).
 */
export function recordsFromTerritoryGeoRows(
  rows: TerritoryGeoRow[],
  triageResolvedAt?: Map<string, string>,
): ResponseTimeRecord[] {
  const out: ResponseTimeRecord[] = [];
  for (const row of rows) {
    if (!isResolvedReportStatus(row.status)) continue;
    if (!row.created_at) continue;

    const sourceTable =
      row.source === 'urbano' ? 'urban_reports' : 'transport_reports';
    const closedAt =
      (row.id && triageResolvedAt?.get(triageMapKey(sourceTable, row.id))) ||
      (row.source === 'transporte' ? row.responded_at : null) ||
      row.updated_at;
    if (!closedAt) continue;

    const geo: GeoReportRow = {
      neighborhood: row.neighborhood,
      location: row.location,
      latitude: row.latitude,
      longitude: row.longitude,
    };

    out.push({
      source: row.source,
      category: safeText(row.category, 'Sem categoria'),
      reportType: row.reportType,
      neighborhood: districtLabelFromGeoRow(geo),
      zone: zoneFromGeoRow(geo),
      hours: diffHours(row.created_at, closedAt),
      createdAt: row.created_at,
      closedAt,
    });
  }
  return out;
}

/** Mesma base geográfica do gráfico de volume (coords + bairro/local). */
export function recordsFromUrbanRows(rows: UrbanReportRow[]): ResponseTimeRecord[] {
  const territoryRows: TerritoryGeoRow[] = rows.map((row) => ({
    id: row.id,
    source: 'urbano' as const,
    status: row.status,
    category: row.category,
    reportType: undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    neighborhood: row.neighborhood,
    location: row.location_address ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
  }));
  return recordsFromTerritoryGeoRows(territoryRows);
}

function stripDistrictPrefix(value: string): string {
  return value.replace(/^(vila|vl|jardim|jd)\s+/, '').trim();
}

function districtKeysMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const sa = stripDistrictPrefix(a);
  const sb = stripDistrictPrefix(b);
  return sa.length > 0 && sb.length > 0 && (sa === sb || sa.includes(sb) || sb.includes(sa));
}

/** Busca zona no breakdown de volume (match exato, substring ou prefixo vila/vl/jd). */
export function lookupZoneFromBreakdown(
  neighborhood: string,
  breakdown: { neighborhood: string; zone: string }[],
): ZonaVolumeOuDesconhecida | null {
  const key = normalizeDistrictKey(neighborhood);
  if (!key) return null;
  for (const row of breakdown) {
    const bk = normalizeDistrictKey(row.neighborhood);
    if (!bk) continue;
    if (districtKeysMatch(key, bk)) {
      return row.zone as ZonaVolumeOuDesconhecida;
    }
  }
  return null;
}

/** Alinha zona do tempo médio ao mapa bairro→zona já exibido no volume. */
export function applyVolumeTerritoryZones(
  records: ResponseTimeRecord[],
  breakdown: { neighborhood: string; zone: string }[],
): ResponseTimeRecord[] {
  if (!breakdown.length) return records;
  return records.map((r) => {
    const zone = lookupZoneFromBreakdown(r.neighborhood, breakdown);
    return zone ? { ...r, zone } : r;
  });
}

/** @deprecated Use applyVolumeTerritoryZones */
export function enrichZonesFromNeighborhoodBreakdown(
  records: ResponseTimeRecord[],
  breakdown: { neighborhood: string; zone: string }[],
): ResponseTimeRecord[] {
  return applyVolumeTerritoryZones(records, breakdown);
}

/** Aplica recorte global (período já veio na query; aqui região + categoria temática). */
export function filterResponseTimeRecords(
  records: ResponseTimeRecord[],
  filters: ReportsAnalyticsFilters,
): ResponseTimeRecord[] {
  const slice = resolveGlobalCategoryFilter(filters.category);
  const allowedCategories = slice.isAll ? null : categoryDbValuesForRpc(slice);
  const zoneFilter = filters.region ? regionLabel(filters.region) : null;

  return records.filter((r) => {
    if (zoneFilter && r.zone !== zoneFilter) return false;
    if (!allowedCategories) return true;
    const cat = normalizeCategory(r.category);
    const reportType = normalizeCategory(r.reportType ?? '');
    return allowedCategories.some((c) => {
      const allowed = normalizeCategory(c);
      return allowed === cat || (reportType.length > 0 && allowed === reportType);
    });
  });
}

function roundHours(value: number): number {
  return Math.round(value * 10) / 10;
}

function averageHours(records: ResponseTimeRecord[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((s, r) => s + r.hours, 0);
  return roundHours(sum / records.length);
}

export function buildResponseTimeDrillStats(records: ResponseTimeRecord[]): ResponseTimeDrillStats {
  if (records.length === 0) return EMPTY_RESPONSE_TIME_DRILL;

  const zoneBuckets = new Map<ZonaVolumeOuDesconhecida, { sum: number; count: number }>();
  for (const zona of ZONAS_FILTRO) zoneBuckets.set(zona, { sum: 0, count: 0 });

  const districtBuckets = new Map<string, { zone: ZonaVolumeOuDesconhecida; sum: number; count: number }>();

  for (const r of records) {
    const z = zoneBuckets.get(r.zone) ?? { sum: 0, count: 0 };
    z.sum += r.hours;
    z.count += 1;
    zoneBuckets.set(r.zone, z);

    const dKey = `${r.zone}\u0000${r.neighborhood}`;
    const d = districtBuckets.get(dKey) ?? { zone: r.zone, sum: 0, count: 0 };
    d.sum += r.hours;
    d.count += 1;
    districtBuckets.set(dKey, d);
  }

  const byZone = ZONAS_FILTRO.map((zone) => {
    const b = zoneBuckets.get(zone) ?? { sum: 0, count: 0 };
    return {
      zone,
      avgHours: b.count > 0 ? roundHours(b.sum / b.count) : 0,
      count: b.count,
    };
  });

  const byNeighborhood = [...districtBuckets.entries()]
    .map(([key, b]) => ({
      neighborhood: key.split('\u0000')[1] ?? 'Sem bairro',
      zone: b.zone,
      avgHours: b.count > 0 ? roundHours(b.sum / b.count) : 0,
      count: b.count,
    }))
    .sort((a, b) => b.count - a.count);

  const categoryBuckets = new Map<string, { sum: number; count: number }>();
  for (const r of records) {
    const key =
      r.reportType && normalizeCategory(r.reportType) !== normalizeCategory(r.category)
        ? r.reportType
        : r.category;
    const cur = categoryBuckets.get(key) ?? { sum: 0, count: 0 };
    cur.sum += r.hours;
    cur.count += 1;
    categoryBuckets.set(key, cur);
  }
  const byCategory = [...categoryBuckets.entries()]
    .map(([category, b]) => ({
      category,
      avgHours: b.count > 0 ? roundHours(b.sum / b.count) : 0,
      count: b.count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    avgHours: averageHours(records),
    resolvedCount: records.length,
    byZone,
    byNeighborhood,
    byCategory,
  };
}

export type ComputeResponseTimeOptions = {
  /** Linhas geo do mesmo recorte do gráfico de volume (preferencial). */
  territoryGeoRows?: TerritoryGeoRow[];
  /** Mapa bairro→zona do volume territorial no recorte ativo. */
  neighborhoodBreakdown?: { neighborhood: string; zone: string }[];
  triageResolvedAt?: Map<string, string>;
  /** Fallback legado — relatos urbanos sem pipeline territorial. */
  urbanRows?: UrbanReportRow[];
};

export async function computeResponseTimeDrillStats(
  filters: ReportsAnalyticsFilters,
  options: ComputeResponseTimeOptions = {},
): Promise<ResponseTimeDrillStats> {
  try {
    const triageMap = options.triageResolvedAt ?? (await fetchTriageResolvedAtMap());
    let merged: ResponseTimeRecord[] = [];

    if (options.territoryGeoRows?.length) {
      merged = recordsFromTerritoryGeoRows(options.territoryGeoRows, triageMap);
    } else if (options.urbanRows?.length) {
      merged = recordsFromUrbanRows(options.urbanRows);
    }

    if (options.neighborhoodBreakdown?.length) {
      merged = applyVolumeTerritoryZones(merged, options.neighborhoodBreakdown);
    }
    return buildResponseTimeDrillStats(filterResponseTimeRecords(merged, filters));
  } catch (err) {
    console.warn('[computeResponseTimeDrillStats]', err);
    return EMPTY_RESPONSE_TIME_DRILL;
  }
}

/** @deprecated Use computeResponseTimeDrillStats */
export async function loadResponseTimeDrillStats(
  filters: ReportsAnalyticsFilters,
): Promise<ResponseTimeDrillStats> {
  return computeResponseTimeDrillStats(filters);
}
