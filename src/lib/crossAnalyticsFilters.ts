import type { ReportsAnalyticsFilters } from "@/hooks/useReportsAnalytics";
import { regionLabel } from "@/lib/analyticsLabels";
import {
  hasCategoryFilterTargets,
  resolveGlobalCategoryFilter,
  type GlobalCategoryFilterSlice,
} from "@/lib/globalCategoryFilter";
import { bairroParaZona } from "@/lib/regionMapping";
import type { UnifiedReport } from "@/lib/analyticsDimensions";

type DateFilterableQuery<T> = {
  gte: (col: string, v: string) => T;
  lte: (col: string, v: string) => T;
};

export function applyCrossAnalyticsDateFilters<T extends DateFilterableQuery<T>>(
  query: T,
  filters: ReportsAnalyticsFilters,
): T {
  let q = query;
  if (filters.startDate) {
    q = q.gte("created_at", `${filters.startDate}T00:00:00`);
  }
  if (filters.endDate) {
    q = q.lte("created_at", `${filters.endDate}T23:59:59`);
  }
  return q;
}

export function resolveCrossCategorySlice(category?: string): GlobalCategoryFilterSlice {
  return resolveGlobalCategoryFilter(category);
}

export function shouldFetchUrbanForCategory(slice: GlobalCategoryFilterSlice): boolean {
  return slice.isAll || slice.urbanCategories.length > 0;
}

export function shouldFetchTransportForCategory(slice: GlobalCategoryFilterSlice): boolean {
  return slice.isAll || slice.transportSubcategories.length > 0;
}

export function shouldFetchEvaluationsForCategory(slice: GlobalCategoryFilterSlice): boolean {
  return slice.isAll || slice.publicServiceTypes.length > 0;
}

/** Alinha o recorte territorial com o dashboard executivo (zona). */
export function filterUnifiedReportsByRegion(
  reports: UnifiedReport[],
  region?: string,
): UnifiedReport[] {
  if (!region || region === "all") return reports;
  const zoneLabel = regionLabel(region);
  return reports.filter((row) => {
    const text = [row.neighborhood].filter(Boolean).join(" ");
    return bairroParaZona(text, row.latitude, row.longitude) === zoneLabel;
  });
}
