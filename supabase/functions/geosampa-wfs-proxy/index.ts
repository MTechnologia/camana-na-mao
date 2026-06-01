/**
 * Proxy para GeoSampa WFS (contorna CORS em produção).
 * O GeoSampa não envia Access-Control-Allow-Origin.
 *
 * Recebe GET com query params (service, typeName, maxFeatures, etc.)
 * e encaminha para wfs.geosampa.prefeitura.sp.gov.br.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { buildCorsHeaders } from "../_shared/cors.ts";

const GEOSAMPA_WFS_BASE =
  "https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs";

serve(async (req) => {
  const CORS_HEADERS = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.toString();
    if (!query) {
      return new Response(
        JSON.stringify({ error: "Missing query parameters (typeName, etc.)" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const targetUrl = `${GEOSAMPA_WFS_BASE}?${query}`;
    const res = await fetch(targetUrl, {
      headers: { Accept: "application/geo+json, application/json" },
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[geosampa-wfs-proxy] Upstream error:", res.status, text.slice(0, 200));
      return new Response(
        JSON.stringify({ error: `GeoSampa returned ${res.status}` }),
        { status: res.status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const contentType = res.headers.get("content-type") ?? "application/json";
    const body = await res.arrayBuffer();
    return new Response(body, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": contentType,
      },
    });
  } catch (err) {
    console.error("[geosampa-wfs-proxy]", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
