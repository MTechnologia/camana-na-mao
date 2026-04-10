/**
 * Proxy autenticado para a API Olho Vivo (SPTrans) via gateway APILib.
 * O token da API Store não fica exposto no app — só nesta função (secret).
 *
 * Documentação SPTrans: https://www.sptrans.com.br/desenvolvedores/api-do-olho-vivo-guia-de-referencia/documentacao-api/
 * Gateway: https://gateway.apilib.prefeitura.sp.gov.br/sptrans/olhovivo/v2.1
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const OLHOVIVO_BASE =
  Deno.env.get("SPTRANS_OLHOVIVO_BASE_URL")?.replace(/\/$/, "") ??
  "https://gateway.apilib.prefeitura.sp.gov.br/sptrans/olhovivo/v2.1";

const ALLOWED_ROOTS = new Set([
  "Posicao",
  "Linha",
  "Parada",
  "Previsao",
  "Corredor",
  "Empresa",
  "KMZ",
  "Integracao",
]);

function isPathAllowed(path: string): boolean {
  const trimmed = path.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!trimmed || trimmed.includes("..") || trimmed.includes("//")) return false;
  const first = trimmed.split("/")[0];
  return Boolean(first && ALLOWED_ROOTS.has(first));
}

function buildSafePath(path: string): string {
  return path
    .split("/")
    .filter((s) => s.length > 0)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

async function requireUser(req: Request): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: Response }
> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Não autorizado", details: "Bearer token ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Configuração do servidor incompleta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Não autorizado", details: "Sessão inválida ou expirada" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
    };
  }

  return { ok: true, userId: user.id };
}

async function proxyToOlhoVivo(path: string, query: URLSearchParams): Promise<Response> {
  const apiToken = Deno.env.get("SPTRANS_OLHOVIVO_BEARER_TOKEN");
  if (!apiToken) {
    console.error("[sptrans-olhovivo] SPTRANS_OLHOVIVO_BEARER_TOKEN não configurado");
    return new Response(
      JSON.stringify({ error: "API de transporte não configurada no servidor" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!isPathAllowed(path)) {
    return new Response(
      JSON.stringify({
        error: "Path não permitido",
        allowed_roots: [...ALLOWED_ROOTS],
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const safePath = buildSafePath(path);
  const qs = query.toString();
  const upstreamUrl = `${OLHOVIVO_BASE}/${safePath}${qs ? `?${qs}` : ""}`;

  const upstream = await fetch(upstreamUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: "application/json",
    },
  });

  const bodyText = await upstream.text();
  const ct = upstream.headers.get("content-type") ?? "application/json";
  const isJson = ct.includes("json") || bodyText.trim().startsWith("{") || bodyText.trim().startsWith("[");

  return new Response(bodyText, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      "Content-Type": isJson ? "application/json; charset=utf-8" : ct,
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  console.log(`[sptrans-olhovivo] user=${auth.userId}`);

  try {
    let path = "";
    const query = new URLSearchParams();

    if (req.method === "GET") {
      const url = new URL(req.url);
      path = url.searchParams.get("path")?.trim() ?? "";
      url.searchParams.forEach((v, k) => {
        if (k !== "path") query.append(k, v);
      });
    } else {
      const body = (await req.json()) as Record<string, unknown>;
      const p = body.path;
      path = typeof p === "string" ? p.trim() : "";
      for (const [k, v] of Object.entries(body)) {
        if (k === "path") continue;
        if (v === undefined || v === null) continue;
        query.append(k, String(v));
      }
    }

    if (!path) {
      return new Response(
        JSON.stringify({
          error: "Parâmetro obrigatório: path",
          hint: 'GET ?path=Posicao&codigoLinha=... ou POST JSON { "path": "Posicao", "codigoLinha": "..." }',
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return await proxyToOlhoVivo(path, query);
  } catch (err) {
    console.error("[sptrans-olhovivo]", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
