import type { DateRangeValue } from '@/components/filters/types';
import { regionLabel } from '@/lib/analyticsLabels';
import {
  categoryDbValuesForRpc,
  resolveGlobalCategoryFilter,
} from '@/lib/globalCategoryFilter';
import { PERIOD_COMPARE_VALUE } from '@/lib/globalFilterOptions';
import { isCompleteDateRange } from '@/lib/dateRangeUtils';
import { dateRangeToIsoDates, globalPeriodKeyToDateRange } from '@/lib/globalPeriodRange';
import type { ExportDataset } from '@/lib/exportFields';
import type { ZonaVolumeOuDesconhecida } from '@/lib/regionMapping';
import { urbanReportsFiltersToReportsAnalytics } from '@/lib/urbanReportsFiltersToAnalytics';

/** Filtros passados ao `DataExportDialog` / hooks de exportação (HU-7.1). */
export type DataExportDefaultFilters = {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  categories?: string[];
  regions?: string[];
  zones?: ZonaVolumeOuDesconhecida[];
  status?: string;
};

export type DataExportFilterSource = {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  category?: string;
  categories?: string[];
  status?: string;
  region?: string;
  regions?: string[];
  zone?: string;
};

function categoriesFromFilterValue(category?: string, dataset?: ExportDataset): string[] | undefined {
  if (!category || category === 'all') return undefined;
  const slice = resolveGlobalCategoryFilter(category);
  if (slice.isAll) return undefined;
  if (dataset === 'transport_reports') {
    const transport = [
      ...new Set([...slice.transportSubcategories, ...slice.publicServiceTypes]),
    ];
    return transport.length > 0 ? transport : undefined;
  }
  if (dataset === 'urban_reports') {
    return slice.urbanCategories.length > 0 ? [...slice.urbanCategories] : undefined;
  }
  const all = categoryDbValuesForRpc(slice);
  return all.length > 0 ? all : undefined;
}

function zoneFromRegionFilter(region?: string): ZonaVolumeOuDesconhecida[] | undefined {
  if (!region || region === 'all') return undefined;
  const zone = regionLabel(region);
  return [zone as ZonaVolumeOuDesconhecida];
}

/** Monta filtros de exportação a partir de um recorte genérico da UI. */
export function buildDataExportDefaultFilters(
  source: DataExportFilterSource,
  dataset?: ExportDataset,
): DataExportDefaultFilters | undefined {
  const out: DataExportDefaultFilters = {};

  if (source.startDate) out.startDate = source.startDate;
  if (source.endDate) out.endDate = source.endDate;

  const categories =
    source.categories ??
    categoriesFromFilterValue(source.category, dataset);
  if (categories?.length) out.categories = categories;

  if (source.status && source.status !== 'all') out.status = source.status;

  if (source.regions?.length) {
    out.regions = source.regions;
  } else if (source.region && source.region !== 'all') {
    const zone = zoneFromRegionFilter(source.region);
    if (zone) out.zones = zone;
    else out.regions = [source.region];
  } else if (source.zone && source.zone !== 'all') {
    out.zones = [source.zone as ZonaVolumeOuDesconhecida];
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

/** Recorte da página de análise de relatos urbanos. */
export function dataExportFiltersFromUrbanAnalytics(
  period: string,
  category: string,
  status: string,
): DataExportDefaultFilters | undefined {
  const analytics = urbanReportsFiltersToReportsAnalytics(period, category, status);
  return buildDataExportDefaultFilters(
    {
      startDate: analytics.startDate,
      endDate: analytics.endDate,
      category,
      status: analytics.status,
    },
    'urban_reports',
  );
}

/** Recorte global da barra analítica (período / região / categoria). */
export function dataExportFiltersFromGlobal(
  period: string,
  region: string,
  category: string,
  periodCompare?: { periodA?: DateRangeValue } | null,
  dataset?: ExportDataset,
): DataExportDefaultFilters | undefined {
  let startDate: string | undefined;
  let endDate: string | undefined;

  if (period === PERIOD_COMPARE_VALUE && isCompleteDateRange(periodCompare?.periodA)) {
    const iso = dateRangeToIsoDates({
      from: periodCompare.periodA.from,
      to: periodCompare.periodA.to,
    });
    startDate = iso.startDate;
    endDate = iso.endDate;
  } else if (period !== PERIOD_COMPARE_VALUE) {
    const iso = dateRangeToIsoDates(globalPeriodKeyToDateRange(period));
    startDate = iso.startDate;
    endDate = iso.endDate;
  }

  return buildDataExportDefaultFilters(
    { startDate, endDate, category, region },
    dataset,
  );
}

export function dataExportFiltersFromDateRange(
  dateRange?: { from?: Date; to?: Date },
  category?: string,
  dataset?: ExportDataset,
): DataExportDefaultFilters | undefined {
  if (!dateRange?.from && !dateRange?.to && (!category || category === 'all')) {
    return undefined;
  }
  const iso =
    dateRange?.from || dateRange?.to
      ? dateRangeToIsoDates({ from: dateRange.from, to: dateRange.to })
      : { startDate: undefined, endDate: undefined };
  return buildDataExportDefaultFilters(
    { startDate: iso.startDate, endDate: iso.endDate, category },
    dataset,
  );
}

export function datasetFromManifestType(typeFilter: string): ExportDataset | undefined {
  if (typeFilter === 'urban') return 'urban_reports';
  if (typeFilter === 'transport') return 'transport_reports';
  return undefined;
}

/** Recorte da gestão unificada de relatos (urbano / transporte). */
export function dataExportFiltersFromReportsManagement(input: {
  dateRange?: { from?: Date; to?: Date };
  categoryFilter: string;
  regionFilter: string;
  statusFilter: string;
  typeFilter: string;
}): { filters?: DataExportDefaultFilters; defaultDataset?: ExportDataset } {
  const iso =
    input.dateRange?.from || input.dateRange?.to
      ? dateRangeToIsoDates({ from: input.dateRange.from, to: input.dateRange.to })
      : { startDate: undefined, endDate: undefined };

  const defaultDataset = datasetFromManifestType(input.typeFilter);

  const filters = buildDataExportDefaultFilters(
    {
      startDate: iso.startDate,
      endDate: iso.endDate,
      categories:
        input.categoryFilter !== 'all' ? [input.categoryFilter] : undefined,
      status: input.statusFilter,
      regions:
        input.regionFilter && input.regionFilter !== 'all'
          ? [input.regionFilter]
          : undefined,
    },
    defaultDataset,
  );

  return { filters, defaultDataset };
}
