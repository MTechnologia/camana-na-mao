// CORS com allowlist: reflete a origem da requisição quando permitida
// (APP_URL, SITE_URL, APP_URL_* e localhost em dev). Evita o `Access-Control-Allow-Origin: *`.
// Leitura de env é preguiçosa (por chamada) para ser testável e robusta em runtime.

/** Frontends Cloud Run conhecidos (fallback quando secrets não listam todos os ambientes). */
const DEFAULT_CLOUD_RUN_ORIGINS = [
  "https://camana-na-mao-767943602990.southamerica-east1.run.app",
  "https://camana-na-mao-hml-767943602990.southamerica-east1.run.app",
  "https://camana-na-mao-dev-767943602990.southamerica-east1.run.app",
  "https://camana-na-mao-beta-767943602990.southamerica-east1.run.app",
] as const;

const ENV_ORIGIN_KEYS = [
  "APP_URL",
  "SITE_URL",
  "APP_URL_HML",
  "APP_URL_DEV",
  "APP_URL_BETA",
] as const;

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/** Lê env de forma resiliente: sem permissão (ex.: testes sem --allow-env) ou sem Deno, retorna undefined em vez de lançar. */
function safeEnvGet(key: string): string | undefined {
  try {
    return Deno.env.get(key);
  } catch {
    return undefined;
  }
}

function parseCsvOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(",").map((v) => stripTrailingSlash(v.trim())).filter(Boolean);
}

/** Origens estáticas permitidas (secrets + CORS_ALLOWED_ORIGINS + Cloud Run conhecidos). */
export function staticAllowedOrigins(
  envGet: (key: string) => string | undefined = safeEnvGet,
): string[] {
  const fromEnv = ENV_ORIGIN_KEYS
    .map((key) => envGet(key))
    .filter((v): v is string => !!v && v.trim().length > 0)
    .map((v) => stripTrailingSlash(v.trim()));
  const fromCsv = parseCsvOrigins(envGet("CORS_ALLOWED_ORIGINS"));
  return [...new Set([...fromCsv, ...fromEnv, ...DEFAULT_CLOUD_RUN_ORIGINS])];
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

/** Resolve o valor de Access-Control-Allow-Origin: reflete a origem se permitida; senão usa a primeira estática (ou '*' se nada configurado). */
export function resolveAllowedOrigin(
  origin: string | null | undefined,
  envGet: (key: string) => string | undefined = safeEnvGet,
): string {
  const o = stripTrailingSlash((origin ?? "").trim());
  const allowed = staticAllowedOrigins(envGet);
  if (o && (allowed.includes(o) || isLocalhostOrigin(o))) return o;
  return allowed[0] ?? "*";
}

/** Headers CORS para a resposta, refletindo a origem permitida da requisição. */
export function buildCorsHeaders(
  req?: { headers?: { get(name: string): string | null } } | null,
  envGet: (key: string) => string | undefined = safeEnvGet,
): Record<string, string> {
  const origin = req?.headers?.get?.("origin") ?? null;
  return {
    "Access-Control-Allow-Origin": resolveAllowedOrigin(origin, envGet),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Vary": "Origin",
  };
}
