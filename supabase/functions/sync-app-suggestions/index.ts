/**
 * Recebe e devolve sugestões persistidas por usuário (ex.: histórico de busca na tela Perto de você).
 * Autenticação: JWT (header Authorization ou body.access_token). Operações usam service role após validar sub.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";

const MAX_ITEMS = 30;
const MAX_LABEL = 500;
const MAX_STABLE_ID = 220;
const MAX_CONTEXT_LEN = 64;
const DEFAULT_CONTEXT = "nearby_search";

type SyncItem = {
  stableId: string;
  kind: string;
  label: string;
  payload?: Record<string, unknown>;
  lastTouchedAt?: string;
};

function getSubFromJwt(jwt: string): string | null {
  try {
    const parts = jwt.trim().split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const obj = JSON.parse(decoded) as { sub?: string };
    return typeof obj.sub === "string" ? obj.sub : null;
  } catch {
    return null;
  }
}

function normalizeContext(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_CONTEXT;
  const t = raw.trim();
  if (t.length > MAX_CONTEXT_LEN) throw new Error("context too long");
  return t;
}

function validateItems(raw: unknown): SyncItem[] {
  if (!Array.isArray(raw)) throw new Error("items must be an array");
  if (raw.length > MAX_ITEMS) throw new Error(`at most ${MAX_ITEMS} items`);
  const seen = new Set<string>();
  const out: SyncItem[] = [];
  for (const row of raw) {
    if (row == null || typeof row !== "object") throw new Error("invalid item");
    const o = row as Record<string, unknown>;
    const stableId = typeof o.stableId === "string" ? o.stableId.trim() : "";
    const kind = typeof o.kind === "string" ? o.kind.trim() : "";
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!stableId || stableId.length > MAX_STABLE_ID) throw new Error("invalid stableId");
    if (!["text", "place", "equipment"].includes(kind)) throw new Error("invalid kind");
    if (!label || label.length > MAX_LABEL) throw new Error("invalid label");
    if (seen.has(stableId)) throw new Error("duplicate stableId");
    seen.add(stableId);
    const payload = o.payload != null && typeof o.payload === "object" && !Array.isArray(o.payload)
      ? o.payload as Record<string, unknown>
      : {};
    const lastTouchedAt = typeof o.lastTouchedAt === "string" ? o.lastTouchedAt.trim() : undefined;
    out.push({ stableId, kind, label, payload, lastTouchedAt });
  }
  return out;
}

function itemsToJsonbArray(items: SyncItem[]): unknown[] {
  return items.map((it) => ({
    stableId: it.stableId,
    kind: it.kind,
    label: it.label,
    payload: it.payload ?? {},
    ...(it.lastTouchedAt ? { lastTouchedAt: it.lastTouchedAt } : {}),
  }));
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("Authorization");
    const jwtFromHeader = authHeader?.replace(/^Bearer\s+/i, "").trim();
    const jwtFromBody = typeof body?.access_token === "string" ? body.access_token.trim() : null;
    const jwt = jwtFromHeader || jwtFromBody;

    if (!jwt) {
      return new Response(JSON.stringify({ error: "Token de autenticação ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = getSubFromJwt(jwt);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const action = typeof body?.action === "string" ? body.action.trim().toLowerCase() : "sync";
    const context = normalizeContext(body?.context);

    if (action === "list") {
      const { data, error } = await admin
        .from("user_app_suggestions")
        .select("stable_id, kind, label, payload, last_touched_at")
        .eq("user_id", userId)
        .eq("context", context)
        .order("last_touched_at", { ascending: false })
        .limit(MAX_ITEMS);

      if (error) {
        console.error("[sync-app-suggestions] list error:", error);
        return new Response(JSON.stringify({ error: "Falha ao listar sugestões" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const items = (data ?? []).map((row) => ({
        stableId: row.stable_id,
        kind: row.kind,
        label: row.label,
        payload: row.payload ?? {},
        lastTouchedAt: row.last_touched_at,
      }));

      return new Response(JSON.stringify({ ok: true, context, items }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync") {
      const validated = validateItems(body?.items);
      const jsonbPayload = itemsToJsonbArray(validated);

      const { error: rpcError } = await admin.rpc("replace_user_app_suggestions_for_user", {
        p_user_id: userId,
        p_context: context,
        p_items: jsonbPayload,
      });

      if (rpcError) {
        console.error("[sync-app-suggestions] rpc error:", rpcError);
        const msg = rpcError.message?.includes("too many") ? "Limite de itens excedido" : "Falha ao salvar sugestões";
        return new Response(JSON.stringify({ error: msg }), {
          status: rpcError.message?.includes("too many") ? 400 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true, context, count: validated.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida. Use action: list | sync" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro inesperado";
    const status = message.includes("invalid") || message.includes("duplicate") || message.includes("at most") ? 400 : 500;
    console.error("[sync-app-suggestions]", e);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
