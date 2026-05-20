import type { ReportsAnalyticsFilters } from '@/hooks/useReportsAnalytics';

/** Converte recorte global (OS-07) em filtros do hook de analytics. */
export function globalFiltersToReportsAnalytics(
  period: string,
  region: string,
  category: string,
): ReportsAnalyticsFilters {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  let start: string;

  switch (period) {
    case 'last_7d':
      start = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      break;
    case 'last_90d':
      start = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);
      break;
    case 'ytd':
      start = `${now.getFullYear()}-01-01`;
      break;
    case 'last_30d':
    default:
      start = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
      break;
  }

  return {
    startDate: start,
    endDate: end,
    ...(region !== 'all' ? { region } : {}),
    ...(category !== 'all' ? { category } : {}),
  };
}
