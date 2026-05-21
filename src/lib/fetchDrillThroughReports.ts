import { supabase } from '@/integrations/supabase/client';
import type { ReportsAnalyticsFilters } from '@/hooks/useReportsAnalytics';
import { DISTRICT_LABEL_FALLBACK, STREET_LABEL_FALLBACK } from '@/lib/reportsAnalyticsAggregates';
import {
  escapeForIlike,
  matchesTerritoryBar,
  matchesTerritoryBarWithStreet,
  parseStreetBarLabel,
  shouldFetchEvaluationsForCategory,
  shouldFetchTransportForCategory,
} from '@/lib/drillThroughMatchers';

/** Relatos exibidos por página no painel drill-through. */
export const DRILL_THROUGH_PAGE_SIZE = 20;
import { resolveGlobalCategoryFilter } from '@/lib/globalCategoryFilter';
import type { ChartBarPoint, DrillReportRow } from '@/types/analyticsDrill';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  triaged: 'Triado',
  referred: 'Encaminhado',
  in_analysis: 'Em análise',
  in_progress: 'Em análise',
  resolved: 'Resolvido',
  closed: 'Encerrado',
};

type SortableRow = DrillReportRow & { sortKey: string };

function applyDateFilters<T extends { gte: (col: string, v: string) => T; lte: (col: string, v: string) => T }>(
  query: T,
  filters: ReportsAnalyticsFilters,
): T {
  let q = query;
  if (filters.startDate) q = q.gte('created_at', `${filters.startDate}T00:00:00`);
  if (filters.endDate) q = q.lte('created_at', `${filters.endDate}T23:59:59`);
  return q;
}

function toUrbanRow(r: {
  id: string;
  description: string | null;
  status: string | null;
  created_at: string | null;
  category: string | null;
  neighborhood: string | null;
  location_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): SortableRow {
  return {
    id: r.id,
    title: (r.description ?? r.category ?? 'Relato urbano').slice(0, 80),
    status: STATUS_LABELS[r.status ?? ''] ?? r.status ?? '—',
    createdAt: new Date(r.created_at ?? '').toLocaleDateString('pt-BR'),
    source: 'urban',
    sortKey: r.created_at ?? '',
  };
}

function toTransportRow(r: {
  id: string;
  description: string | null;
  status: string | null;
  created_at: string | null;
  report_type: string;
  sub_category: string | null;
}): SortableRow {
  const label = r.sub_category
    ? `${r.report_type} · ${r.sub_category}`
    : r.report_type;
  return {
    id: r.id,
    title: (r.description ?? label ?? 'Relato de transporte').slice(0, 80),
    status: STATUS_LABELS[r.status ?? ''] ?? r.status ?? '—',
    createdAt: new Date(r.created_at ?? '').toLocaleDateString('pt-BR'),
    source: 'transport',
    sortKey: r.created_at ?? '',
  };
}

function toEvaluationRow(r: {
  id: string;
  rating_text: string | null;
  created_at: string | null;
  public_services: { name?: string; service_type?: string } | null;
}): SortableRow {
  const svc = r.public_services;
  return {
    id: r.id,
    title: (r.rating_text ?? svc?.name ?? svc?.service_type ?? 'Avaliação').slice(0, 80),
    status: 'Avaliação',
    createdAt: new Date(r.created_at ?? '').toLocaleDateString('pt-BR'),
    source: 'evaluation',
    sortKey: r.created_at ?? '',
  };
}

export type DrillThroughScope = {
  activeRegion?: string;
  activeDistrict?: string;
};

function territorialFetchLimit(bar: ChartBarPoint): number {
  if (bar.filterKey === 'street' || bar.filterKey === 'district' || bar.filterKey === 'region') {
    return 3000;
  }
  return 120;
}

function applyTerritorialUrbanQuery<T extends {
  or: (filter: string) => T;
  ilike: (col: string, pattern: string) => T;
  eq: (col: string, value: string) => T;
}>(
  query: T,
  bar: ChartBarPoint,
  scope?: DrillThroughScope,
): T {
  let q = query;

  const districtName =
    scope?.activeDistrict ?? (bar.filterKey === 'district' ? bar.filterValue : undefined);
  // Em nível de rua o bairro é validado no cliente (neighborhood pode estar só no endereço).
  if (
    bar.filterKey !== 'street' &&
    districtName &&
    districtName !== DISTRICT_LABEL_FALLBACK
  ) {
    const pattern = `%${escapeForIlike(districtName)}%`;
    q = q.or(`neighborhood.ilike.${pattern},location_address.ilike.${pattern}`);
  }

  if (bar.filterKey === 'street' && bar.label !== STREET_LABEL_FALLBACK) {
    const { street, number } = parseStreetBarLabel(bar.label);
    const parts: string[] = [];
    if (street) {
      const pattern = `%${escapeForIlike(street)}%`;
      parts.push(`street.ilike.${pattern}`, `location_address.ilike.${pattern}`);
    }
    if (number) {
      parts.push(`street_number.eq.${number}`);
    }
    if (parts.length > 0) {
      q = q.or(parts.join(','));
    }
  }

  return q;
}

async function fetchUrbanDrillRows(
  filters: ReportsAnalyticsFilters,
  bar: ChartBarPoint,
  categorySlice: ReturnType<typeof resolveGlobalCategoryFilter>,
  scope?: DrillThroughScope,
): Promise<SortableRow[]> {
  if (bar.filterKey === 'category' && shouldFetchTransportForCategory(bar.filterValue)) {
    if (!shouldFetchEvaluationsForCategory(bar.filterValue)) return [];
  }

  let query = supabase
    .from('urban_reports')
    .select(
      'id, description, status, created_at, category, neighborhood, location_address, street, street_number, latitude, longitude',
    )
    .order('created_at', { ascending: false })
    .limit(territorialFetchLimit(bar));

  query = applyDateFilters(query, filters);

  if (bar.filterKey === 'category') {
    query = query.eq('category', bar.filterValue);
  } else if (!categorySlice.isAll && categorySlice.urbanCategories.length > 0) {
    query = query.in('category', categorySlice.urbanCategories);
  } else if (bar.filterKey === 'street' || bar.filterKey === 'district' || bar.filterKey === 'region') {
    query = applyTerritorialUrbanQuery(query, bar, scope);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('[fetchDrillThroughReports] urban', error.message);
    return [];
  }

  return (data ?? [])
    .filter((r) =>
      bar.filterKey === 'category'
        ? true
        : matchesTerritoryBarWithStreet(
            bar,
            filters.region,
            r.neighborhood,
            r.location_address,
            r.latitude,
            r.longitude,
            r.street,
            r.street_number,
            scope?.activeDistrict,
          ),
    )
    .map(toUrbanRow);
}

async function fetchTransportDrillRows(
  filters: ReportsAnalyticsFilters,
  bar: ChartBarPoint,
  categorySlice: ReturnType<typeof resolveGlobalCategoryFilter>,
): Promise<SortableRow[]> {
  if (bar.filterKey === 'street') {
    return [];
  }

  const fetchForCategory =
    bar.filterKey === 'category' ||
    (!categorySlice.isAll && categorySlice.transportSubcategories.length > 0);

  if (bar.filterKey === 'category' && shouldFetchEvaluationsForCategory(bar.filterValue)) {
    return [];
  }

  if (
    !fetchForCategory &&
    bar.filterKey !== 'region' &&
    bar.filterKey !== 'district' &&
    bar.filterKey !== 'street'
  ) {
    return [];
  }

  let query = supabase
    .from('transport_reports')
    .select(
      'id, description, status, created_at, report_type, sub_category, location, stop_location',
    )
    .order('created_at', { ascending: false })
    .limit(120);

  query = applyDateFilters(query, filters);

  if (bar.filterKey === 'category') {
    query = query.or(
      `report_type.eq.${bar.filterValue},sub_category.eq.${bar.filterValue}`,
    );
  } else if (!categorySlice.isAll && categorySlice.transportSubcategories.length > 0) {
    const orParts = categorySlice.transportSubcategories.flatMap((sc) => [
      `report_type.eq.${sc}`,
      `sub_category.eq.${sc}`,
    ]);
    query = query.or(orParts.join(','));
  }

  const { data, error } = await query;
  if (error) {
    console.warn('[fetchDrillThroughReports] transport', error.message);
    return [];
  }

  return (data ?? [])
    .filter((r) =>
      bar.filterKey === 'category'
        ? true
        : matchesTerritoryBar(bar, filters.region, null, r.location ?? r.stop_location),
    )
    .map(toTransportRow);
}

async function fetchEvaluationDrillRows(
  filters: ReportsAnalyticsFilters,
  bar: ChartBarPoint,
): Promise<SortableRow[]> {
  if (bar.filterKey !== 'category' || !shouldFetchEvaluationsForCategory(bar.filterValue)) {
    return [];
  }

  let query = supabase
    .from('service_ratings')
    .select(
      'id, rating_text, created_at, public_services!inner(name, service_type, district, latitude, longitude)',
    )
    .eq('publication_status', 'published')
    .eq('public_services.service_type', bar.filterValue)
    .order('created_at', { ascending: false })
    .limit(120);

  query = applyDateFilters(query, filters);

  const { data, error } = await query;
  if (error) {
    console.warn('[fetchDrillThroughReports] evaluations', error.message);
    return [];
  }

  return (data ?? []).map((r) =>
    toEvaluationRow(
      r as {
        id: string;
        rating_text: string | null;
        created_at: string | null;
        public_services: { name?: string; service_type?: string } | null;
      },
    ),
  );
}

export type DrillThroughFetchResult = {
  reports: DrillReportRow[];
  total: number;
};

export async function fetchDrillThroughReports(
  filters: ReportsAnalyticsFilters,
  bar: ChartBarPoint,
  scope?: DrillThroughScope,
): Promise<DrillThroughFetchResult> {
  const categorySlice = resolveGlobalCategoryFilter(filters.category);

  const [urban, transport, evaluations] = await Promise.all([
    fetchUrbanDrillRows(filters, bar, categorySlice, scope),
    fetchTransportDrillRows(filters, bar, categorySlice),
    fetchEvaluationDrillRows(filters, bar),
  ]);

  const merged = [...urban, ...transport, ...evaluations].sort((a, b) =>
    b.sortKey.localeCompare(a.sortKey),
  );

  const reports = merged.map(({ id, title, status, createdAt, source }) => ({
    id,
    title,
    status,
    createdAt,
    source,
  }));

  return { reports, total: reports.length };
}

export function paginateDrillThroughReports(
  reports: DrillReportRow[],
  page: number,
  pageSize: number = DRILL_THROUGH_PAGE_SIZE,
): DrillReportRow[] {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return reports.slice(start, start + pageSize);
}

export function drillThroughTotalPages(total: number, pageSize: number = DRILL_THROUGH_PAGE_SIZE): number {
  if (total <= 0) return 1;
  return Math.ceil(total / pageSize);
}
