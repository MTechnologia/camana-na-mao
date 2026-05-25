import { regionLabel } from '@/lib/analyticsLabels';
import { bairroParaZona } from '@/lib/regionMapping';
import { resolveGlobalCategoryFilter } from '@/lib/globalCategoryFilter';
import {
  shouldFetchTransportForCategory,
  shouldFetchUrbanForCategory,
} from '@/lib/crossAnalyticsFilters';
import { urbanReportMatchesGlobalRegion } from '@/lib/urbanReportRegion';

export type KanbanGlobalRecorte = {
  createdFrom?: Date;
  createdTo?: Date;
  globalRegion?: string;
  globalCategory?: string;
};

export const KANBAN_FETCH_CAP = 500;

export function kanbanHasGlobalRecorte(recorte: KanbanGlobalRecorte): boolean {
  return Boolean(
    recorte.createdFrom
    || recorte.createdTo
    || (recorte.globalRegion && recorte.globalRegion !== 'all')
    || (recorte.globalCategory && recorte.globalCategory !== 'all'),
  );
}

export function kanbanWantsUrbanSource(
  localSources: ('urban' | 'transport')[] | undefined,
  categoryKey: string | undefined,
): boolean {
  const wantsLocal = !localSources || localSources.length === 0 || localSources.includes('urban');
  if (!wantsLocal) return false;
  const slice = resolveGlobalCategoryFilter(categoryKey ?? 'all');
  if (slice.isAll) return true;
  return shouldFetchUrbanForCategory(slice);
}

export function kanbanWantsTransportSource(
  localSources: ('urban' | 'transport')[] | undefined,
  categoryKey: string | undefined,
): boolean {
  const wantsLocal = !localSources || localSources.length === 0 || localSources.includes('transport');
  if (!wantsLocal) return false;
  const slice = resolveGlobalCategoryFilter(categoryKey ?? 'all');
  if (slice.isAll) return true;
  return shouldFetchTransportForCategory(slice);
}

type FilterableQuery<T> = {
  gte: (col: string, v: string) => T;
  lte: (col: string, v: string) => T;
  in: (col: string, values: string[]) => T;
};

export function applyKanbanDateRange<T extends FilterableQuery<T>>(
  query: T,
  recorte: KanbanGlobalRecorte,
): T {
  let q = query;
  if (recorte.createdFrom) {
    q = q.gte('created_at', recorte.createdFrom.toISOString());
  }
  if (recorte.createdTo) {
    q = q.lte('created_at', recorte.createdTo.toISOString());
  }
  return q;
}

export function applyKanbanUrbanCategory<T extends FilterableQuery<T>>(
  query: T,
  categoryKey: string | undefined,
): T {
  const slice = resolveGlobalCategoryFilter(categoryKey ?? 'all');
  if (!slice.isAll && slice.urbanCategories.length > 0) {
    return query.in('category', slice.urbanCategories);
  }
  return query;
}

export function applyKanbanTransportCategory<T extends FilterableQuery<T>>(
  query: T,
  categoryKey: string | undefined,
): T {
  const slice = resolveGlobalCategoryFilter(categoryKey ?? 'all');
  if (!slice.isAll && slice.transportSubcategories.length > 0) {
    return query.in('report_type', slice.transportSubcategories);
  }
  return query;
}

export type KanbanUrbanLocationRow = {
  location_address?: string | null;
  neighborhood?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function kanbanUrbanRowMatchesRegion(
  row: KanbanUrbanLocationRow,
  regionKey: string | undefined,
): boolean {
  if (!regionKey || regionKey === 'all') return true;
  return urbanReportMatchesGlobalRegion(
    {
      locationAddress: row.location_address ?? null,
      neighborhood: row.neighborhood ?? null,
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
    },
    regionKey,
  );
}

export function kanbanTransportRowMatchesRegion(
  row: { location?: string | null; stop_name?: string | null },
  regionKey: string | undefined,
): boolean {
  if (!regionKey || regionKey === 'all') return true;
  const zoneLabel = regionLabel(regionKey);
  const text = [row.stop_name, row.location].filter(Boolean).join(' ');
  return bairroParaZona(text, null, null) === zoneLabel;
}
