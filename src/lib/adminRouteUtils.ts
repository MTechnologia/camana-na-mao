/** Rotas do painel que exibem a barra unificada de recorte analítico (RN-ANL-002). */
const ANALYTICS_CONTEXT_PATHS = [
  '/admin',
  '/admin/analytics',
  '/admin/trends',
  '/admin/reports-heatmap',
  '/admin/classification-accuracy',
  '/admin/reports',
  '/admin/referrals',
  '/admin/equipment-ratings',
  '/admin/public-hearings',
  '/paineis',
] as const;

export function usesUnifiedAnalyticsBar(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return ANALYTICS_CONTEXT_PATHS.some(
    (base) => path === base || path.startsWith(`${base}/`),
  );
}
