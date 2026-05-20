import { regionLabel } from '@/lib/analyticsLabels';
import { bairroParaZona } from '@/lib/regionMapping';
import { DISTRICT_LABEL_FALLBACK } from '@/lib/reportsAnalyticsAggregates';
import { WIDGET_THEMES } from '@/lib/widgetThemes';
import type { ChartBarPoint } from '@/types/analyticsDrill';

export const TRANSPORT_REPORT_TYPES = new Set(
  WIDGET_THEMES.flatMap((t) => t.transportSubcategories),
);

export const PUBLIC_SERVICE_TYPES = new Set(
  WIDGET_THEMES.flatMap((t) => t.publicServiceTypes),
);

export function drillThroughResultLimit(barValue: number): number {
  const n = Math.round(barValue);
  if (n <= 0) return 3;
  return Math.min(12, Math.max(3, n));
}

export function normalizeDistrictToken(value: string): string {
  return value
    .trim()
    .replace(/\s*-\s*$/g, '')
    .toLowerCase();
}

export function locationText(
  neighborhood?: string | null,
  location?: string | null,
): string {
  return [neighborhood, location].filter(Boolean).join(' ');
}

export function zoneForLocation(
  neighborhood?: string | null,
  location?: string | null,
  lat?: number | null,
  lng?: number | null,
): string {
  return bairroParaZona(locationText(neighborhood, location), lat, lng);
}

export function matchesDistrictBar(
  bar: ChartBarPoint,
  neighborhood?: string | null,
  location?: string | null,
): boolean {
  if (bar.filterKey !== 'district') return true;

  if (
    bar.filterValue === DISTRICT_LABEL_FALLBACK ||
    bar.label === DISTRICT_LABEL_FALLBACK
  ) {
    return !neighborhood?.trim();
  }

  const targets = new Set([
    normalizeDistrictToken(bar.filterValue),
    normalizeDistrictToken(bar.label),
  ]);
  const nb = normalizeDistrictToken(neighborhood ?? '');
  if (nb && targets.has(nb)) return true;

  const locPart = location?.split(',')[0]?.trim();
  if (locPart && targets.has(normalizeDistrictToken(locPart))) return true;

  return false;
}

export function matchesTerritoryBar(
  bar: ChartBarPoint,
  filtersRegion: string | undefined,
  neighborhood?: string | null,
  location?: string | null,
  lat?: number | null,
  lng?: number | null,
): boolean {
  const zone = zoneForLocation(neighborhood, location, lat, lng);
  const zoneFromFilters = filtersRegion ? regionLabel(filtersRegion) : null;

  if (bar.filterKey === 'region') {
    return zone === bar.label;
  }

  if (!matchesDistrictBar(bar, neighborhood, location)) {
    return false;
  }

  if (zoneFromFilters && (bar.filterKey === 'district' || bar.filterKey === 'region')) {
    return zone === zoneFromFilters;
  }

  return true;
}

/** Categorias de barra que devem buscar em transport_reports (report_type). */
export function shouldFetchTransportForCategory(categoryValue: string): boolean {
  return TRANSPORT_REPORT_TYPES.has(categoryValue);
}

/** Categorias que são avaliações (service_ratings + public_services). */
export function shouldFetchEvaluationsForCategory(categoryValue: string): boolean {
  return PUBLIC_SERVICE_TYPES.has(categoryValue);
}
