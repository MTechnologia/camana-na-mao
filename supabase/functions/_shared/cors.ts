// CORS com allowlist: reflete a origem da requisição quando permitida
// (APP_URL, SITE_URL e localhost em dev). Evita o `Access-Control-Allow-Origin: *`.
// Leitura de env é preguiçosa (por chamada) para ser testável e robusta em runtime.

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/** Origens estáticas permitidas, vindas dos secrets APP_URL e SITE_URL. */
export function staticAllowedOrigins(
  envGet: (key: string) => string | undefined = (k) => Deno.env.get(k),
): string[] {
  return [envGet("APP_URL"), envGet("SITE_URL")]
    .filter((v): v is string => !!v && v.trim().length > 0)
    .map((v) => stripTrailingSlash(v.trim()));
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
  envGet: (key: string) => string | undefined = (k) => Deno.env.get(k),
): string {
  const o = stripTrailingSlash((origin ?? "").trim());
  const allowed = staticAllowedOrigins(envGet);
  if (o && (allowed.includes(o) || isLocalhostOrigin(o))) return o;
  return allowed[0] ?? "*";
}

/** Headers CORS para a resposta, refletindo a origem permitida da requisição. */
export function buildCorsHeaders(
  req?: { headers?: { get(name: string): string | null } } | null,
  envGet: (key: string) => string | undefined = (k) => Deno.env.get(k),
): Record<string, string> {
  const origin = req?.headers?.get?.("origin") ?? null;
  return {
    "Access-Control-Allow-Origin": resolveAllowedOrigin(origin, envGet),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Vary": "Origin",
  };
}
