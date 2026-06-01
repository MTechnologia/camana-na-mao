/**
 * NREF005 — Busca e cadastro de linhas via API Olho Vivo (SPTrans).
 *
 * POST { action: 'search', query: string, limit?: number }
 * POST { action: 'resolve', line_code: string, line_name?: string, sptrans_codigo_linha?: number, line_type?: string }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { olhoVivoSearchLines } from "../_shared/olho-vivo.ts";
import {
  buildCatalogSearchOr,
  mergeOlhoWithCatalog,
  pickCanonicalLineCode,
  stripSptransLineSuffix,
  type DbTransportLine,
} from "../_shared/transport-line-catalog.ts";

import { buildCorsHeaders } from "../_shared/cors.ts";
// corsHeaders resolvido por request (reatribuído no início do handler).
let corsHeaders: Record<string, string> = buildCorsHeaders();

type SearchBody = { action: "search"; query: string; limit?: number };
type ResolveBody = {
  action: "resolve";
  line_code: string;
  line_name?: string;
  sptrans_codigo_linha?: number;
  line_type?: string;
};
type RequestBody = SearchBody | ResolveBody;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Configuração do servidor incompleta." }, 500);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  if (body.action === "search") {
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const limit = Math.min(Math.max(Number(body.limit) || 12, 1), 30);

    if (query.length < 2) {
      return json({ lines: [], source: "none" });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const olho = await olhoVivoSearchLines(query);
    const olhoLines = olho.success ? (olho.lines ?? []) : [];
    const olhoBases = [
      ...new Set(
        olhoLines.map((l) => stripSptransLineSuffix(String(l.lt ?? "").trim())).filter(Boolean),
      ),
    ];

    const orClause = buildCatalogSearchOr(query, olhoBases);
    let dbRows: DbTransportLine[] = [];

    if (orClause) {
      const { data, error: dbErr } = await admin
        .from("transport_lines")
        .select("id, line_code, line_name, line_type, sptrans_codigo_linha")
        .or(orClause)
        .order("line_code")
        .limit(Math.max(limit * 3, 40));

      if (dbErr) {
        console.error("[transport-lines] catalog search", dbErr);
      } else {
        dbRows = (data ?? []) as DbTransportLine[];
      }
    }

    const lines = mergeOlhoWithCatalog(olhoLines, dbRows, limit);

    if (lines.length === 0 && !olho.success) {
      return json({
        lines: [],
        source: "olho_vivo",
        error: olho.error,
        fallback: true,
      });
    }

    return json({
      lines,
      source: dbRows.length > 0 ? "catalog_gtfs" : "olho_vivo",
    });
  }

  if (body.action === "resolve") {
    const lineCode = typeof body.line_code === "string" ? body.line_code.trim() : "";
    if (lineCode.length < 2) {
      return json({ error: "line_code é obrigatório." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const sptransCodigo = typeof body.sptrans_codigo_linha === "number"
      ? body.sptrans_codigo_linha
      : null;

    const base = stripSptransLineSuffix(lineCode);
    const { data: exactRow } = await admin
      .from("transport_lines")
      .select("id, line_code, line_name, line_type, sptrans_codigo_linha")
      .eq("line_code", lineCode)
      .maybeSingle();

    const prefixPattern = base ? `${base}-%` : `${lineCode}-%`;
    const { data: prefixRows } = await admin
      .from("transport_lines")
      .select("id, line_code, line_name, line_type, sptrans_codigo_linha")
      .ilike("line_code", prefixPattern)
      .order("line_code");

    const catalogCandidates = [
      ...(exactRow ? [exactRow] : []),
      ...((prefixRows ?? []).filter(
        (r) => r.line_code?.toLowerCase() !== lineCode.toLowerCase(),
      )),
    ] as DbTransportLine[];

    const canonical = pickCanonicalLineCode(lineCode, catalogCandidates);

    if (canonical?.id) {
      if (sptransCodigo && !canonical.sptrans_codigo_linha) {
        await admin
          .from("transport_lines")
          .update({ sptrans_codigo_linha: sptransCodigo })
          .eq("id", canonical.id);
      }
      return json({ line: canonical, created: false });
    }

    let resolvedCode = canonical?.line_code ?? lineCode;
    let lineName = canonical?.line_name
      ?? (typeof body.line_name === "string" ? body.line_name.trim() : "");
    let lineType = canonical?.line_type
      ?? (typeof body.line_type === "string" ? body.line_type.trim() : "bus");
    let resolvedSptrans = sptransCodigo ?? canonical?.sptrans_codigo_linha ?? null;

    if (!canonical) {
      const olho = await olhoVivoSearchLines(base || lineCode);
      if (olho.success && olho.lines?.length) {
        const merged = mergeOlhoWithCatalog(
          olho.lines,
          (catalogCandidates ?? []) as DbTransportLine[],
          5,
        );
        const match = merged.find(
          (l) => l.line_code.toLowerCase() === lineCode.toLowerCase(),
        ) ?? merged[0];
        if (match?.id) {
          return json({ line: match, created: false });
        }
        if (match) {
          resolvedCode = match.line_code;
          lineName = lineName || match.line_name;
          lineType = match.line_type;
          resolvedSptrans = resolvedSptrans ?? match.sptrans_codigo_linha;
        }
      }
    }

    if (!lineName) {
      lineName = resolvedCode;
    }

    const { data: inserted, error: insertErr } = await admin
      .from("transport_lines")
      .insert({
        line_code: resolvedCode,
        line_name: lineName,
        line_type: lineType || "bus",
        sptrans_codigo_linha: resolvedSptrans,
        regions: [],
      })
      .select("id, line_code, line_name, line_type, sptrans_codigo_linha")
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        const { data: retry } = await admin
          .from("transport_lines")
          .select("id, line_code, line_name, line_type, sptrans_codigo_linha")
          .eq("line_code", lineCode)
          .maybeSingle();
        if (retry?.id) {
          return json({ line: retry, created: false });
        }
      }
      console.error("[transport-lines] resolve insert", insertErr);
      return json({ error: "Não foi possível registrar a linha." }, 500);
    }

    return json({ line: inserted, created: true });
  }

  return json({ error: "action inválida. Use search ou resolve." }, 400);
});
