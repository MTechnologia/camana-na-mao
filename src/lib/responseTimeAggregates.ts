import { supabase } from '@/integrations/supabase/client';
import type { ReportsAnalyticsFilters } from '@/hooks/useReportsAnalytics';
import {
  categoryDbValuesForRpc,
  resolveGlobalCategoryFilter,
} from '@/lib/globalCategoryFilter';
import { regionLabel } from '@/lib/analyticsLabels';
import {
  bairroParaZona,
  ZONA_DESCONHECIDA,
  ZONAS_FILTRO,
  type ZonaVolumeOuDesconhecida,
} from '@/lib/regionMapping';
import {
  districtLabelFromGeoRow,
  type GeoReportRow,
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
    .trim();
}

function normalizeCategory(value: string): string {
  return normalizeDistrictKey(value);
}

function zoneFromGeoRow(row: GeoReportRow): ZonaVolumeOuDesconhecida {
  const text = [row.neighborhood, row.location].filter(Boolean).join(' ');
  return bairroParaZona(text, row.latitude, row.longitude);
}

/** Mesma base geográfica do gráfico de volume (coords + bairro/local). */
export function recordsFromUrbanRows(rows: UrbanReportRow[]): ResponseTimeRecord[] {
  const out: ResponseTimeRecord[] = [];
  for (const row of rows) {
    if (row.status !== 'resolved' && row.status !== 'closed') continue;
    if (!row.created_at || !row.updated_at) continue;
    const geo: GeoReportRow = {
      neighborhood: row.neighborhood,
      location: row.location_address ?? null,
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
    };
    out.push({
      source: 'urbano',
      category: safeText(row.category, 'Sem categoria'),
      neighborhood: districtLabelFromGeoRow(geo),
      zone: zoneFromGeoRow(geo),
      hours: diffHours(row.created_at, row.updated_at),
      createdAt: row.created_at,
      closedAt: row.updated_at,
    });
  }
  return out;
}

/**
 * Quando coords/texto não classificam a zona, reaproveita o mapa bairro→zona
 * já calculado para o volume territorial no mesmo recorte.
 */
export function enrichZonesFromNeighborhoodBreakdown(
  records: ResponseTimeRecord[],
  breakdown: { neighborhood: string; zone: string }[],
): ResponseTimeRecord[] {
  if (!breakdown.length) return records;
  const map = new Map<string, ZonaVolumeOuDesconhecida>();
  for (const row of breakdown) {
    map.set(normalizeDistrictKey(row.neighborhood), row.zone as ZonaVolumeOuDesconhecida);
  }
  return records.map((r) => {
    if (r.zone !== ZONA_DESCONHECIDA) return r;
    const zone = map.get(normalizeDistrictKey(r.neighborhood));
    return zone ? { ...r, zone } : r;
  });
}

async function fetchResolvedTransportForFilters(
  filters: ReportsAnalyticsFilters,
): Promise<ResponseTimeRecord[]> {
  const slice = resolveGlobalCategoryFilter(filters.category);
  if (!slice.isAll && slice.transportSubcategories.length === 0) {
    return [];
  }

  const out: ResponseTimeRecord[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let q = supabase
      .from('transport_reports')
      .select(
        'created_at, updated_at, responded_at, status, report_type, sub_category, location, stop_location',
      )
      .eq('status', 'resolved')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filters.startDate) {
      q = q.gte('created_at', `${filters.startDate}T00:00:00`);
    }
    if (filters.endDate) {
      q = q.lte('created_at', `${filters.endDate}T23:59:59`);
    }
    if (!slice.isAll) {
      const orParts = slice.transportSubcategories.flatMap((sc) => [
        `sub_category.eq.${sc}`,
        `report_type.eq.${sc}`,
      ]);
      if (orParts.length === 0) return out;
      q = q.or(orParts.join(','));
    }

    const { data, error } = await q;
    if (error) throw error;
    const rows = data ?? [];
    for (const r of rows) {
      const closedAt = r.responded_at ?? r.updated_at;
      if (!r.created_at || !closedAt) continue;
      const location = (r.location as string) || (r.stop_location as string) || '';
      const geo: GeoReportRow = { neighborhood: null, location: location || null };
      out.push({
        source: 'transporte',
        category: safeText(r.sub_category || r.report_type, 'Sem categoria'),
        reportType: safeText(r.report_type, ''),
        neighborhood: districtLabelFromGeoRow(geo),
        zone: zoneFromGeoRow(geo),
        hours: diffHours(r.created_at, closedAt),
        createdAt: r.created_at,
        closedAt,
      });
    }
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
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
  /** Relatos urbanos já carregados para volume/timeline (mesmo recorte por created_at). */
  urbanRows?: UrbanReportRow[];
  /** Mapa bairro→zona do volume territorial no recorte ativo. */
  neighborhoodBreakdown?: { neighborhood: string; zone: string }[];
};

export async function computeResponseTimeDrillStats(
  filters: ReportsAnalyticsFilters,
  options: ComputeResponseTimeOptions = {},
): Promise<ResponseTimeDrillStats> {
  try {
    const urban = options.urbanRows ? recordsFromUrbanRows(options.urbanRows) : [];
    const transport = await fetchResolvedTransportForFilters(filters);
    let merged = [...urban, ...transport];
    if (options.neighborhoodBreakdown?.length) {
      merged = enrichZonesFromNeighborhoodBreakdown(merged, options.neighborhoodBreakdown);
    }
    return buildResponseTimeDrillStats(filterResponseTimeRecords(merged, filters));
  } catch (err) {
    console.warn('[computeResponseTimeDrillStats]', err);
    return EMPTY_RESPONSE_TIME_DRILL;
  }
}

/** @deprecated Use computeResponseTimeDrillStats — mantido para compatibilidade. */
export async function loadResponseTimeDrillStats(
  filters: ReportsAnalyticsFilters,
): Promise<ResponseTimeDrillStats> {
  return computeResponseTimeDrillStats(filters);
}
