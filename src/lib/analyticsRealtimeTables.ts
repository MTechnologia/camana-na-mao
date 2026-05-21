import type { ReportsAnalyticsFilters } from '@/hooks/useReportsAnalytics';

/** Tabelas observadas na análise urbana dedicada (HU-5.3). */
export const ANALYTICS_REALTIME_URBAN = [
  'urban_reports',
  'urban_report_likes',
  'urban_report_comments',
  'report_patterns',
] as const;

/** Tabelas observadas no painel executivo e gestão com filtros globais (HU-5.3). */
export const ANALYTICS_REALTIME_FULL = [
  'urban_reports',
  'transport_reports',
  'service_ratings',
  'report_patterns',
] as const;

export function getAnalyticsRealtimeTables(
  scope?: ReportsAnalyticsFilters['scope'],
): readonly string[] {
  return scope === 'urban_only' ? ANALYTICS_REALTIME_URBAN : ANALYTICS_REALTIME_FULL;
}
