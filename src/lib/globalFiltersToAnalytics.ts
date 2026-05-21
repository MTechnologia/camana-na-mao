import type { ReportsAnalyticsFilters } from '@/hooks/useReportsAnalytics';
import type { DateRangeValue } from '@/components/filters/types';
import { PERIOD_COMPARE_VALUE } from '@/lib/globalFilterOptions';
import { isCompleteDateRange } from '@/lib/dateRangeUtils';
import { dateRangeToIsoDates, globalPeriodKeyToDateRange } from '@/lib/globalPeriodRange';

export type PeriodCompareFilterInput = {
  periodA?: DateRangeValue;
};

/** Converte recorte global (OS-07) em filtros do hook de analytics. */
export function globalFiltersToReportsAnalytics(
  period: string,
  region: string,
  category: string,
  periodCompare?: PeriodCompareFilterInput | null,
): ReportsAnalyticsFilters {
  let start: string;
  let end: string;

  if (period === PERIOD_COMPARE_VALUE && isCompleteDateRange(periodCompare?.periodA)) {
    const iso = dateRangeToIsoDates({
      from: periodCompare.periodA.from,
      to: periodCompare.periodA.to,
    });
    start = iso.startDate;
    end = iso.endDate;
  } else if (period === PERIOD_COMPARE_VALUE) {
    const iso = dateRangeToIsoDates(globalPeriodKeyToDateRange('last_30d'));
    start = iso.startDate;
    end = iso.endDate;
  } else {
    const iso = dateRangeToIsoDates(globalPeriodKeyToDateRange(period));
    start = iso.startDate;
    end = iso.endDate;
  }

  return {
    startDate: start,
    endDate: end,
    ...(region !== 'all' ? { region } : {}),
    ...(category !== 'all' ? { category } : {}),
  };
}
