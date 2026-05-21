import type { ReportsAnalyticsFilters } from '@/hooks/useReportsAnalytics';
import { dateRangeToIsoDates, globalPeriodKeyToDateRange } from '@/lib/globalPeriodRange';

/** Converte recorte da página de análise de relatos urbanos em filtros do hook. */
export function urbanReportsFiltersToReportsAnalytics(
  period: string,
  category: string,
  status: string,
): ReportsAnalyticsFilters {
  const { from, to } = globalPeriodKeyToDateRange(period);
  const { startDate, endDate } = dateRangeToIsoDates({ from, to });

  return {
    startDate,
    endDate,
    scope: 'urban_only',
    ...(category !== 'all' ? { category } : {}),
    ...(status !== 'all' ? { status } : {}),
  };
}
