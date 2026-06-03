/** Rotas que exibem a barra unificada de recorte (RN-ANL-002 / HU-5.2). */
const UNIFIED_ANALYTICS_BAR_EXACT = ["/admin"] as const;

const UNIFIED_ANALYTICS_BAR_PREFIXES = [
  "/admin/reports",
  "/admin/triagem",
  "/admin/referrals",
  "/admin/commissions",
  "/admin/analytics",
  "/admin/trends",
  "/admin/reports-heatmap",
  "/admin/equipment-ratings",
  "/admin/public-hearings",
] as const;

const PAINELS_PREFIXES = ["/paineis"] as const;

/** Rotas com gráficos de seção que reutilizam analytics globais (filtros + stats). */
const GLOBAL_ANALYTICS_PREFIXES = [
  ...UNIFIED_ANALYTICS_BAR_PREFIXES,
  ...PAINELS_PREFIXES,
  "/admin/exports",
  "/admin/notifications",
  "/admin/docs",
  "/admin/settings",
] as const;

function matchesPathPrefix(path: string, bases: readonly string[]): boolean {
  return bases.some((base) => path === base || path.startsWith(`${base}/`));
}

export function usesUnifiedAnalyticsBar(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (UNIFIED_ANALYTICS_BAR_EXACT.some((base) => path === base)) {
    return true;
  }

  return (
    matchesPathPrefix(path, UNIFIED_ANALYTICS_BAR_PREFIXES) ||
    matchesPathPrefix(path, PAINELS_PREFIXES)
  );
}

export function usesGlobalReportsAnalytics(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (UNIFIED_ANALYTICS_BAR_EXACT.some((base) => path === base)) {
    return true;
  }

  return matchesPathPrefix(path, GLOBAL_ANALYTICS_PREFIXES);
}
