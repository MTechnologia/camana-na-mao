// HU-7.4 — Disparador periódico de exports agendados.
//
// Deve ser chamada por um cron Supabase a cada 5 minutos. Procura entradas em
// `scheduled_exports` onde `enabled=true AND next_run_at <= now()`, cria um
// `export_job` para cada uma (com source='scheduled'), invoca a function
// `process-export-job` para processar e recalcula `next_run_at` via função
// SQL `calc_next_export_run`.
//
// Não bloqueia esperando processamento; dispara fire-and-forget para cada job.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

import { buildCorsHeaders } from "../_shared/cors.ts";

interface ScheduledExportRow {
  id: string;
  user_id: string;
  name: string;
  dataset: string;
  format: "csv" | "xlsx";
  fields: string[];
  order_by: { fieldId: string; direction: "asc" | "desc" };
  filters: Record<string, unknown>;
  include_summary: boolean;
  recurrence: "daily" | "weekly" | "monthly";
  run_hour: number;
  run_minute: number;
  weekday: number | null;
  monthday: number | null;
  // HU-8.1 — período relativo e notificação in-app
  period_kind: "relative" | "fixed";
  period_relative:
    | "yesterday"
    | "last_7d"
    | "last_30d"
    | "previous_month"
    | "current_month"
    | "last_quarter"
    | "last_year"
    | null;
  notify_in_app: boolean;
}

/**
 * HU-8.1 — Resolve janela de período relativo (espelha src/lib/relativePeriod.ts).
 * Mantém em sincronia se adicionar novos kinds.
 */
function resolveRelativePeriod(
  kind: ScheduledExportRow["period_relative"],
  baseDate: Date = new Date(),
): { startDate: string; endDate: string } | null {
  if (!kind) return null;
  const start = new Date(baseDate);
  const end = new Date(baseDate);
  switch (kind) {
    case "yesterday":
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "last_7d":
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "last_30d":
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "previous_month": {
      const prev = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
      start.setTime(prev.getTime());
      start.setHours(0, 0, 0, 0);
      end.setTime(
        new Date(baseDate.getFullYear(), baseDate.getMonth(), 0, 23, 59, 59, 999).getTime(),
      );
      break;
    }
    case "current_month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "last_quarter": {
      const prevMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() - 3, 1);
      const qStart = Math.floor(prevMonth.getMonth() / 3) * 3;
      start.setTime(new Date(prevMonth.getFullYear(), qStart, 1).getTime());
      start.setHours(0, 0, 0, 0);
      end.setTime(
        new Date(prevMonth.getFullYear(), qStart + 3, 0, 23, 59, 59, 999).getTime(),
      );
      break;
    }
    case "last_year":
      start.setTime(new Date(baseDate.getFullYear() - 1, 0, 1).getTime());
      start.setHours(0, 0, 0, 0);
      end.setTime(new Date(baseDate.getFullYear() - 1, 11, 31, 23, 59, 59, 999).getTime());
      break;
  }
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

async function invokeProcessExportJob(
  supabaseUrl: string,
  jobId: string,
): Promise<{ ok: boolean; status: number; body: string }> {
  const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
  const gatewayKey =
    Deno.env.get("SUPABASE_ANON_KEY")?.trim() ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ||
    "";

  if (!cronSecret && !gatewayKey) {
    throw new Error(
      "Sem credenciais para invocar process-export-job (CRON_SECRET ou chave Supabase)",
    );
  }

  const invokeUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/process-export-job`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cronSecret) headers["X-Cron-Secret"] = cronSecret;
  if (gatewayKey) {
    headers["Authorization"] = `Bearer ${gatewayKey}`;
    headers["apikey"] = gatewayKey;
  }

  const res = await fetch(invokeUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ jobId }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`[cron] process-export-job/${jobId} HTTP ${res.status}:`, body);
  }
  return { ok: res.ok, status: res.status, body };
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
  const headerSecret = req.headers.get("x-cron-secret")?.trim();
  if (cronSecret && headerSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Config ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1) Busca agendamentos vencidos.
    const { data: due, error: dueErr } = await supabase
      .from("scheduled_exports")
      .select("*")
      .eq("enabled", true)
      .lte("next_run_at", new Date().toISOString())
      .limit(50);

    if (dueErr) throw dueErr;
    const dueList = (due ?? []) as ScheduledExportRow[];

    const processed: Array<{
      scheduledExportId: string;
      jobId: string | null;
      error?: string;
    }> = [];

    for (const sch of dueList) {
      try {
        // HU-8.1 — Quando o período é relativo, recalculamos a janela
        // dinamicamente no momento do disparo e sobrescrevemos as datas
        // no filters do job. Para 'fixed', preservamos o snapshot original.
        let effectiveFilters: Record<string, unknown> = { ...(sch.filters ?? {}) };
        if (sch.period_kind === "relative" && sch.period_relative) {
          const window = resolveRelativePeriod(sch.period_relative, new Date());
          if (window) {
            effectiveFilters = {
              ...effectiveFilters,
              startDate: window.startDate,
              endDate: window.endDate,
            };
          }
        }

        // 2) Cria o job em pending.
        const { data: jobIns, error: jobErr } = await supabase
          .from("export_jobs")
          .insert({
            user_id: sch.user_id,
            dataset: sch.dataset,
            format: sch.format,
            fields: sch.fields,
            order_by: sch.order_by,
            filters: effectiveFilters,
            include_summary: sch.include_summary,
            source: "scheduled",
            scheduled_export_id: sch.id,
            status: "pending",
          })
          .select("id")
          .single();
        if (jobErr) throw jobErr;
        const jobId = (jobIns as { id: string }).id;

        // 3) Dispara process-export-job em background (waitUntil evita cancelamento
        //    do fetch quando o handler retorna; diferente do fire-and-forget nu).
        EdgeRuntime.waitUntil(
          invokeProcessExportJob(supabaseUrl, jobId).then((result) => {
            if (!result.ok) {
              console.error(
                `[cron] process-export-job/${jobId} falhou:`,
                result.status,
                result.body.slice(0, 300),
              );
            }
          }),
        );

        // 4) Atualiza last_run_at + recalcula next_run_at via SQL function.
        const { data: nextRes, error: nextErr } = await supabase.rpc(
          "calc_next_export_run",
          {
            p_recurrence: sch.recurrence,
            p_run_hour: sch.run_hour,
            p_run_minute: sch.run_minute,
            p_weekday: sch.weekday,
            p_monthday: sch.monthday,
            p_base: new Date().toISOString(),
          },
        );
        if (nextErr) throw nextErr;
        await supabase
          .from("scheduled_exports")
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRes as string,
          })
          .eq("id", sch.id);

        processed.push({ scheduledExportId: sch.id, jobId });
      } catch (err) {
        const message = err instanceof Error ? err.message : "erro desconhecido";
        console.error(`[cron] erro no scheduled_export ${sch.id}:`, err);
        processed.push({ scheduledExportId: sch.id, jobId: null, error: message });
      }
    }

    // 5) Recupera jobs agendados presos em pending (ex.: fetch fire-and-forget antigo).
    const staleBefore = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: staleJobs } = await supabase
      .from("export_jobs")
      .select("id")
      .eq("status", "pending")
      .eq("source", "scheduled")
      .lt("created_at", staleBefore)
      .order("created_at", { ascending: true })
      .limit(20);

    const reprocessed: string[] = [];
    for (const row of staleJobs ?? []) {
      const jobId = (row as { id: string }).id;
      EdgeRuntime.waitUntil(
        invokeProcessExportJob(supabaseUrl, jobId).then((result) => {
          if (!result.ok) {
            console.error(
              `[cron] reprocess pending/${jobId} falhou:`,
              result.status,
              result.body.slice(0, 300),
            );
          }
        }),
      );
      reprocessed.push(jobId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed: processed.length,
        items: processed,
        reprocessed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[cron-scheduled-exports] erro:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
