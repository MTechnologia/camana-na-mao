/** CHB-021: CORS restrito por lista de origens (produção). */
const BASE_CORS: Record<string, string> = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function parseAllowedOrigins(envGet: (key: string) => string | undefined): string[] {
  const raw = String(envGet("AI_CORS_ALLOWED_ORIGINS") ?? "").trim();
  if (!raw) return [];
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

export function buildCorsHeaders(
  requestOrigin: string | null,
  envGet: (key: string) => string | undefined = Deno.env.get.bind(Deno.env),
): Record<string, string> {
  const allowed = parseAllowedOrigins(envGet);
  if (allowed.length === 0) {
    return { ...BASE_CORS, "Access-Control-Allow-Origin": "*" };
  }
  if (requestOrigin && allowed.includes(requestOrigin)) {
    return { ...BASE_CORS, "Access-Control-Allow-Origin": requestOrigin, Vary: "Origin" };
  }
  return { ...BASE_CORS, "Access-Control-Allow-Origin": allowed[0], Vary: "Origin" };
}
