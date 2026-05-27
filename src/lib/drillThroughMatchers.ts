import { regionLabel } from '@/lib/analyticsLabels';
import { bairroParaZona } from '@/lib/regionMapping';
import {
  DISTRICT_FALLBACK_ID,
  DISTRICT_LABEL_FALLBACK,
  districtLabelFromGeoRow,
  STREET_FALLBACK_ID,
  STREET_LABEL_FALLBACK,
  streetLabelFromTerritoryRow,
  territoryLabelsMatch,
} from '@/lib/reportsAnalyticsAggregates';
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

/** Escapa valor para filtros ilike do PostgREST. */
export function escapeForIlike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&').trim();
}

function districtMatchCandidates(
  neighborhood?: string | null,
  location?: string | null,
): string[] {
  const candidates: string[] = [];
  const nb = neighborhood?.trim().replace(/\s*-\s*$/g, '');
  if (nb) candidates.push(nb);
  const loc = location?.trim();
  if (loc) {
    for (const part of loc.split(',')) {
      const piece = part.trim().replace(/\s*-\s*$/g, '');
      if (piece) candidates.push(piece);
    }
    candidates.push(loc);
  }
  return candidates;
}

function barTerritoryTargets(bar: ChartBarPoint): string[] {
  const targets = [bar.filterValue, bar.label, bar.id].filter(Boolean);
  return [...new Set(targets)];
}

function isDistrictFallbackBar(bar: ChartBarPoint): boolean {
  return (
    bar.filterValue === DISTRICT_LABEL_FALLBACK ||
    bar.filterValue === DISTRICT_FALLBACK_ID ||
    bar.label === DISTRICT_LABEL_FALLBACK ||
    bar.id === DISTRICT_FALLBACK_ID
  );
}

function isStreetFallbackBar(bar: ChartBarPoint): boolean {
  return (
    bar.filterValue === STREET_FALLBACK_ID ||
    bar.label === STREET_LABEL_FALLBACK ||
    bar.id === STREET_FALLBACK_ID
  );
}

function effectiveZoneFilter(
  filtersRegion: string | undefined,
  activeRegion?: string,
): string | null {
  if (filtersRegion && filtersRegion !== 'all') {
    return regionLabel(filtersRegion);
  }
  if (activeRegion) return regionLabel(activeRegion);
  return null;
}

export function parseStreetBarLabel(label: string): { street: string; number?: string } {
  const trimmed = label.trim().replace(/\s*-\s*$/g, '');
  const commaIdx = trimmed.lastIndexOf(',');
  if (commaIdx > 0) {
    const street = trimmed.slice(0, commaIdx).trim();
    const number = trimmed.slice(commaIdx + 1).trim();
    if (street && number) return { street, number };
  }
  return { street: trimmed };
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

  if (isDistrictFallbackBar(bar)) {
    return (
      districtLabelFromGeoRow({ neighborhood, location }) === DISTRICT_LABEL_FALLBACK
    );
  }

  const targets = barTerritoryTargets(bar);
  const candidates = districtMatchCandidates(neighborhood, location);
  if (candidates.length === 0) return false;

  return targets.some((target) =>
    candidates.some((candidate) => territoryLabelsMatch(target, candidate)),
  );
}

export function matchesTerritoryBar(
  bar: ChartBarPoint,
  filtersRegion: string | undefined,
  neighborhood?: string | null,
  location?: string | null,
  lat?: number | null,
  lng?: number | null,
  activeRegion?: string,
): boolean {
  const zone = zoneForLocation(neighborhood, location, lat, lng);
  const zoneFilter = effectiveZoneFilter(filtersRegion, activeRegion);

  if (bar.filterKey === 'region') {
    return zone === bar.label;
  }

  if (!matchesDistrictBar(bar, neighborhood, location)) {
    return false;
  }

  if (zoneFilter && (bar.filterKey === 'district' || bar.filterKey === 'region')) {
    return zone === zoneFilter;
  }

  return true;
}

export function matchesStreetBar(
  bar: ChartBarPoint,
  neighborhood?: string | null,
  location?: string | null,
  street?: string | null,
  streetNumber?: string | null,
  activeDistrict?: string,
): boolean {
  if (bar.filterKey !== 'street') return true;

  if (activeDistrict) {
    const districtBar: ChartBarPoint = {
      id: activeDistrict,
      label: activeDistrict,
      value: 0,
      filterKey: 'district',
      filterValue: activeDistrict,
    };
    if (!matchesDistrictBar(districtBar, neighborhood, location)) {
      return false;
    }
  }

  if (isStreetFallbackBar(bar)) {
    return (
      streetLabelFromTerritoryRow({
        neighborhood,
        location,
        street,
        street_number: streetNumber,
      }) === STREET_LABEL_FALLBACK
    );
  }

  const reportLabel = streetLabelFromTerritoryRow({
    neighborhood,
    location,
    street,
    street_number: streetNumber,
  });

  return barTerritoryTargets(bar).some((target) => territoryLabelsMatch(target, reportLabel));
}

export function matchesTerritoryBarWithStreet(
  bar: ChartBarPoint,
  filtersRegion: string | undefined,
  neighborhood?: string | null,
  location?: string | null,
  lat?: number | null,
  lng?: number | null,
  street?: string | null,
  streetNumber?: string | null,
  activeDistrict?: string,
  activeRegion?: string,
): boolean {
  if (bar.filterKey === 'street') {
    const zone = zoneForLocation(neighborhood, location, lat, lng);
    const zoneFilter = effectiveZoneFilter(filtersRegion, activeRegion);
    if (!matchesStreetBar(bar, neighborhood, location, street, streetNumber, activeDistrict)) {
      return false;
    }
    if (zoneFilter) return zone === zoneFilter;
    return true;
  }
  return matchesTerritoryBar(
    bar,
    filtersRegion,
    neighborhood,
    location,
    lat,
    lng,
    activeRegion,
  );
}

/** Categorias de barra que devem buscar em transport_reports (report_type). */
export function shouldFetchTransportForCategory(categoryValue: string): boolean {
  return TRANSPORT_REPORT_TYPES.has(categoryValue);
}

/** Categorias que são avaliações (service_ratings + public_services). */
export function shouldFetchEvaluationsForCategory(categoryValue: string): boolean {
  return PUBLIC_SERVICE_TYPES.has(categoryValue);
}
