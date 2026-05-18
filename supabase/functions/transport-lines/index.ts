/**
 * NREF005 — Busca e cadastro de linhas via API Olho Vivo (SPTrans).
 *
 * POST { action: 'search', query: string, limit?: number }
 * POST { action: 'resolve', line_code: string, line_name?: string, sptrans_codigo_linha?: number, line_type?: string }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  dedupeOlhoVivoLines,
  olhoVivoSearchLines,
} from "../_shared/olho-vivo.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    const olho = await olhoVivoSearchLines(query);
    if (!olho.success) {
      return json({
        lines: [],
        source: "olho_vivo",
        error: olho.error,
        fallback: true,
      });
    }

    const catalog = dedupeOlhoVivoLines(olho.lines ?? []).slice(0, limit);
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const codes = catalog.map((c) => c.line_code);
    const { data: existing } = codes.length
      ? await admin
        .from("transport_lines")
        .select("id, line_code, line_name, line_type, sptrans_codigo_linha")
        .in("line_code", codes)
      : { data: [] };

    const byCode = new Map(
      (existing ?? []).map((row) => [String(row.line_code), row]),
    );

    const lines = catalog.map((item) => {
      const row = byCode.get(item.line_code);
      return {
        id: row?.id ?? null,
        line_code: item.line_code,
        line_name: row?.line_name ?? item.line_name,
        line_type: row?.line_type ?? item.line_type,
        sptrans_codigo_linha: item.sptrans_codigo_linha,
        direction_label: item.direction_label,
      };
    });

    return json({ lines, source: "olho_vivo" });
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

    const { data: existingByCode } = await admin
      .from("transport_lines")
      .select("id, line_code, line_name, line_type, sptrans_codigo_linha")
      .eq("line_code", lineCode)
      .maybeSingle();

    if (existingByCode?.id) {
      if (sptransCodigo && !existingByCode.sptrans_codigo_linha) {
        await admin
          .from("transport_lines")
          .update({ sptrans_codigo_linha: sptransCodigo })
          .eq("id", existingByCode.id);
      }
      return json({ line: existingByCode, created: false });
    }

    let lineName = typeof body.line_name === "string" ? body.line_name.trim() : "";
    let lineType = typeof body.line_type === "string" ? body.line_type.trim() : "bus";
    let resolvedSptrans = sptransCodigo;

    if (!lineName || !resolvedSptrans) {
      const olho = await olhoVivoSearchLines(lineCode);
      if (olho.success && olho.lines?.length) {
        const match = dedupeOlhoVivoLines(olho.lines).find(
          (l) => l.line_code.toLowerCase() === lineCode.toLowerCase(),
        ) ?? dedupeOlhoVivoLines(olho.lines)[0];
        if (match) {
          lineName = lineName || match.line_name;
          lineType = match.line_type;
          resolvedSptrans = resolvedSptrans ?? match.sptrans_codigo_linha;
        }
      }
    }

    if (!lineName) {
      lineName = lineCode;
    }

    const { data: inserted, error: insertErr } = await admin
      .from("transport_lines")
      .insert({
        line_code: lineCode,
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
