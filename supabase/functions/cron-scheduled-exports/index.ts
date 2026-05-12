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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
        // 2) Cria o job em pending.
        const { data: jobIns, error: jobErr } = await supabase
          .from("export_jobs")
          .insert({
            user_id: sch.user_id,
            dataset: sch.dataset,
            format: sch.format,
            fields: sch.fields,
            order_by: sch.order_by,
            filters: sch.filters,
            include_summary: sch.include_summary,
            source: "scheduled",
            scheduled_export_id: sch.id,
            status: "pending",
          })
          .select("id")
          .single();
        if (jobErr) throw jobErr;
        const jobId = (jobIns as { id: string }).id;

        // 3) Dispara process-export-job (fire-and-forget). O cron edge function
        //    pode ter timeout curto; não esperamos a conclusão.
        const invokeUrl = `${supabaseUrl}/functions/v1/process-export-job`;
        fetch(invokeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ jobId }),
        }).catch((e) =>
          console.error(`[cron] falha ao invocar process-export-job/${jobId}:`, e),
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

    return new Response(
      JSON.stringify({ ok: true, processed: processed.length, items: processed }),
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
