/** CHB-021: CORS restrito por lista de origens (produção). */
import { staticAllowedOrigins } from "../_shared/cors.ts";

const BASE_CORS: Record<string, string> = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function isLocalhost(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

function parseAllowedOrigins(envGet: (key: string) => string | undefined): string[] {
  const raw = String(envGet("AI_CORS_ALLOWED_ORIGINS") ?? "").trim();
  const explicit = raw ? raw.split(",").map((o) => o.trim()).filter(Boolean) : [];
  // Combina com APP_URL/SITE_URL para não cair em '*' quando AI_CORS_ALLOWED_ORIGINS não está setado.
  return [...new Set([...explicit, ...staticAllowedOrigins(envGet)])];
}

export function buildCorsHeaders(
  requestOrigin: string | null,
  envGet: (key: string) => string | undefined = Deno.env.get.bind(Deno.env),
): Record<string, string> {
  const allowed = parseAllowedOrigins(envGet);
  if (allowed.length === 0) {
    return { ...BASE_CORS, "Access-Control-Allow-Origin": "*" };
  }
  if (requestOrigin && (allowed.includes(requestOrigin) || isLocalhost(requestOrigin))) {
    return { ...BASE_CORS, "Access-Control-Allow-Origin": requestOrigin, Vary: "Origin" };
  }
  return { ...BASE_CORS, "Access-Control-Allow-Origin": allowed[0], Vary: "Origin" };
}
