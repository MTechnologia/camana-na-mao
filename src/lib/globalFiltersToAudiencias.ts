import type { AudienciasFilters } from '@/hooks/useAudienciasAnalytics';
import { PERIOD_COMPARE_VALUE } from '@/lib/globalFilterOptions';

/** Converte recorte global (OS-07) em filtros de audiências. */
export function globalFiltersToAudiencias(
  period: string,
  region: string,
): AudienciasFilters {
  const now = new Date();
  let start: Date;

  switch (period) {
    case 'last_7d':
      start = new Date(now.getTime() - 7 * 86400000);
      break;
    case 'last_90d':
      start = new Date(now.getTime() - 90 * 86400000);
      break;
    case 'ytd':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case PERIOD_COMPARE_VALUE:
    case 'last_30d':
    default:
      start = new Date(now.getTime() - 30 * 86400000);
      break;
  }

  return {
    startDate: start,
    // Não limitar por data máxima: audiências futuras entram no painel (como no app cidadão).
    endDate: null,
    ...(region !== 'all' ? { regions: [region] } : {}),
  };
}
