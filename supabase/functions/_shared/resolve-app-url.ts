/**
 * Resolve a URL base do front (dev / hml / prod) para links em e-mails e notificações.
 *
 * Prioridade:
 * 1. Origem explícita (payload ou filters.__app_origin)
 * 2. Heurística pelo nome do agendamento (ex.: "... hml", "... dev")
 * 3. Secrets APP_URL_HML / APP_URL_DEV / APP_URL
 */

const DEFAULT_APP_URLS = {
  prod: "https://camana-na-mao-767943602990.southamerica-east1.run.app",
  hml: "https://camana-na-mao-hml-767943602990.southamerica-east1.run.app",
  dev: "https://camana-na-mao-dev-767943602990.southamerica-east1.run.app",
} as const;

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function envUrl(key: "APP_URL" | "APP_URL_HML" | "APP_URL_DEV"): string {
  return normalizeOrigin(Deno.env.get(key) ?? "");
}

/** Detecta dev/hml pelo nome do agendamento (fallback quando filters não têm __app_origin). */
export function inferAppUrlFromScheduleName(scheduleName?: string | null): string | null {
  if (!scheduleName?.trim()) return null;
  const n = scheduleName.toLowerCase();
  if (/\bhml\b|[-_]hml(?:\b|[-_])|(?:^|[-_])hml(?:\b|[-_])/.test(n)) {
    return envUrl("APP_URL_HML") || DEFAULT_APP_URLS.hml;
  }
  if (/\bdev\b|[-_]dev(?:\b|[-_])|(?:^|[-_])dev(?:\b|[-_])/.test(n)) {
    return envUrl("APP_URL_DEV") || DEFAULT_APP_URLS.dev;
  }
  return null;
}

export function readAppOriginFromFilters(
  filters?: Record<string, unknown> | null,
): string {
  const raw = filters?.__app_origin;
  return typeof raw === "string" ? normalizeOrigin(raw) : "";
}

export function resolveAppUrl(input: {
  explicitOrigin?: string | null;
  filters?: Record<string, unknown> | null;
  scheduleName?: string | null;
}): string {
  const explicit = input.explicitOrigin?.trim()
    ? normalizeOrigin(input.explicitOrigin)
    : "";
  const fromFilters = readAppOriginFromFilters(input.filters);
  if (explicit) return explicit;
  if (fromFilters) return fromFilters;

  const inferred = inferAppUrlFromScheduleName(input.scheduleName);
  if (inferred) return inferred;

  return envUrl("APP_URL") || DEFAULT_APP_URLS.prod;
}
