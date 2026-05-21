import { CITIZEN_REPORT_STATUS_LABELS, CITIZEN_REPORT_STATUS_VALUES } from '@/lib/citizenReportStatus';
import { CATEGORY_FILTER_OPTIONS, PERIOD_FILTER_OPTIONS, labelForCategory, labelForPeriod } from '@/lib/globalFilterOptions';

/** Períodos da análise de relatos urbanos (sem modo comparar). */
export const URBAN_ANALYTICS_PERIOD_OPTIONS = PERIOD_FILTER_OPTIONS.filter(
  (p) => p.value !== 'compare',
);

export const URBAN_ANALYTICS_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  ...CITIZEN_REPORT_STATUS_VALUES.map((value) => ({
    value,
    label: CITIZEN_REPORT_STATUS_LABELS[value],
  })),
] as const;

export { CATEGORY_FILTER_OPTIONS as URBAN_ANALYTICS_CATEGORY_OPTIONS };

export function labelForUrbanAnalyticsStatus(value: string): string {
  if (value === 'all') return 'Todos os status';
  return URBAN_ANALYTICS_STATUS_OPTIONS.find((s) => s.value === value)?.label ?? value;
}

export function urbanAnalyticsFilterChipLabels(
  period: string,
  category: string,
  status: string,
): string[] {
  return [labelForPeriod(period), labelForCategory(category), labelForUrbanAnalyticsStatus(status)];
}
