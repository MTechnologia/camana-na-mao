/** Rotas que exibem a barra unificada de recorte (RN-ANL-002 / HU-5.2). */
const UNIFIED_ANALYTICS_BAR_EXACT = ['/admin'] as const;

const UNIFIED_ANALYTICS_BAR_PREFIXES = [
  '/admin/reports',
  '/admin/triagem',
  '/admin/referrals',
  '/admin/commissions',
] as const;

/** Rotas com gráficos de seção que reutilizam analytics globais (filtros + stats). */
const GLOBAL_ANALYTICS_PREFIXES = [
  ...UNIFIED_ANALYTICS_BAR_PREFIXES,
  '/admin/exports',
  '/admin/notifications',
  '/admin/docs',
  '/admin/settings',
] as const;

export function usesUnifiedAnalyticsBar(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';

  if (UNIFIED_ANALYTICS_BAR_EXACT.some((base) => path === base)) {
    return true;
  }

  return UNIFIED_ANALYTICS_BAR_PREFIXES.some(
    (base) => path === base || path.startsWith(`${base}/`),
  );
}

export function usesGlobalReportsAnalytics(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';

  if (UNIFIED_ANALYTICS_BAR_EXACT.some((base) => path === base)) {
    return true;
  }

  return GLOBAL_ANALYTICS_PREFIXES.some(
    (base) => path === base || path.startsWith(`${base}/`),
  );
}
