import { supabase } from '@/integrations/supabase/client';
import type { ReportsAnalyticsFilters } from '@/hooks/useReportsAnalytics';
import {
  categoryDbValuesForRpc,
  resolveGlobalCategoryFilter,
} from '@/lib/globalCategoryFilter';
import { regionLabel } from '@/lib/analyticsLabels';
import { bairroParaZona, ZONAS_FILTRO, type ZonaVolumeOuDesconhecida } from '@/lib/regionMapping';
import { districtLabelFromGeoRow, type GeoReportRow } from '@/lib/reportsAnalyticsAggregates';

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

function toIsoRange(start?: string, end?: string): { startIso: string | null; endIso: string | null } {
  return {
    startIso: start ? new Date(`${start}T00:00:00`).toISOString() : null,
    endIso: end ? new Date(`${end}T23:59:59`).toISOString() : null,
  };
}

function diffHours(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms > 0 ? ms / 36e5 : 0;
}

function safeText(value: unknown, fallback = 'Não informado'): string {
  const text = (value as string | null | undefined)?.toString().trim();
  return text && text.length > 0 ? text : fallback;
}

function zoneFromRow(
  neighborhood: string | null | undefined,
  location: string | null | undefined,
  lat?: number | null,
  lng?: number | null,
): ZonaVolumeOuDesconhecida {
  const text = [neighborhood, location].filter(Boolean).join(' ');
  return bairroParaZona(text, lat, lng);
}

async function fetchResolvedUrban(startIso: string | null, endIso: string | null): Promise<ResponseTimeRecord[]> {
  const out: ResponseTimeRecord[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let q = supabase
      .from('urban_reports')
      .select('created_at, updated_at, status, category, neighborhood, location_address, latitude, longitude')
      .eq('status', 'resolved')
      .order('updated_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (startIso) q = q.gte('updated_at', startIso);
    if (endIso) q = q.lte('updated_at', endIso);
    const { data, error } = await q;
    if (error) throw error;
    const rows = data ?? [];
    for (const r of rows) {
      if (!r.created_at || !r.updated_at) continue;
      const neighborhood = safeText(r.neighborhood, '');
      out.push({
        source: 'urbano',
        category: safeText(r.category, 'Sem categoria'),
        neighborhood: neighborhood || districtLabelFromGeoRow({
          neighborhood: r.neighborhood,
          location: r.location_address,
        }),
        zone: zoneFromRow(r.neighborhood, r.location_address, r.latitude, r.longitude),
        hours: diffHours(r.created_at, r.updated_at),
        createdAt: r.created_at,
        closedAt: r.updated_at,
      });
    }
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchResolvedTransport(
  startIso: string | null,
  endIso: string | null,
): Promise<ResponseTimeRecord[]> {
  const out: ResponseTimeRecord[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let q = supabase
      .from('transport_reports')
      .select(
        'created_at, updated_at, responded_at, status, report_type, sub_category, location, stop_location',
      )
      .eq('status', 'resolved')
      .order('updated_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (startIso) q = q.gte('updated_at', startIso);
    if (endIso) q = q.lte('updated_at', endIso);
    const { data, error } = await q;
    if (error) throw error;
    const rows = data ?? [];
    for (const r of rows) {
      const closedAt = r.responded_at ?? r.updated_at;
      if (!r.created_at || !closedAt) continue;
      const location = (r.location as string) || (r.stop_location as string) || '';
      const neighborhood = safeText(location, '');
      out.push({
        source: 'transporte',
        category: safeText(r.sub_category || r.report_type, 'Sem categoria'),
        reportType: safeText(r.report_type, ''),
        neighborhood: neighborhood || 'Sem local',
        zone: zoneFromRow(null, location),
        hours: diffHours(r.created_at, closedAt),
        createdAt: r.created_at,
        closedAt,
      });
    }
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

function normalizeCategory(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
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
    const key = r.reportType && normalizeCategory(r.reportType) !== normalizeCategory(r.category)
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

export async function loadResponseTimeDrillStats(
  filters: ReportsAnalyticsFilters,
): Promise<ResponseTimeDrillStats> {
  const { startIso, endIso } = toIsoRange(filters.startDate, filters.endDate);
  try {
    const [urban, transport] = await Promise.all([
      fetchResolvedUrban(startIso, endIso),
      fetchResolvedTransport(startIso, endIso),
    ]);
    const filtered = filterResponseTimeRecords([...urban, ...transport], filters);
    return buildResponseTimeDrillStats(filtered);
  } catch (err) {
    console.warn('[loadResponseTimeDrillStats]', err);
    return EMPTY_RESPONSE_TIME_DRILL;
  }
}
