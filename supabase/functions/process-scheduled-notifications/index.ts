/**
 * Processa linhas em `notifications` com scheduled_for <= agora e push_delivered_at nulo.
 * Chama send-web-push com o mesmo payload do Database Webhook (INSERT) para enviar push/e-mail/SMS.
 *
 * RN-NOT-004: o envio multi-canal e o caso delivered_in_app_only são implementados em send-web-push;
 * esta função orquestra a fila agendada e agrega métricas da resposta.
 *
 * Invocar a cada 5 min (cron externo ou pg_cron) com header x-cron-secret se CRON_SECRET estiver definido.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  effectiveDailyLimit,
  shouldDiscardForDailyLimit,
} from "../_shared/daily-limit.ts";
import {
  computeNextSendAfterQuietHours,
  DEFAULT_QUIET_HOURS_TZ,
  isCriticalNotification,
  isInQuietHours,
} from "../_shared/quiet-hours.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
  const headerSecret = req.headers.get("x-cron-secret")?.trim();
  if (cronSecret && headerSecret !== cronSecret) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const nowIso = new Date().toISOString();

    const { data: rows, error: selErr } = await supabase
      .from("notifications")
      .select("*")
      .not("scheduled_for", "is", null)
      .is("push_delivered_at", null)
      .is("discarded_at", null)
      .lte("scheduled_for", nowIso)
      .order("scheduled_for", { ascending: true })
      .limit(100);

    if (selErr) {
      console.error("[process-scheduled-notifications] select:", selErr);
      return new Response(JSON.stringify({ success: false, error: selErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const list = rows ?? [];
    let processed = 0;
    let failed = 0;
    let deferredQuietHours = 0;
    let discardedDailyLimit = 0;
    let deliveredInAppOnly = 0;

    const tz = Deno.env.get("NOTIFICATION_QUIET_HOURS_TZ")?.trim() || DEFAULT_QUIET_HOURS_TZ;
    const userIds = [...new Set(list.map((r) => r.user_id as string))];
    let settingsByUser = new Map<
      string,
      {
        quiet_hours_start: unknown;
        quiet_hours_end: unknown;
        max_daily_notifications: unknown;
      }
    >();
    if (userIds.length > 0) {
      const { data: settingsRows } = await supabase
        .from("notification_settings")
        .select("user_id, quiet_hours_start, quiet_hours_end, max_daily_notifications")
        .in("user_id", userIds);
      settingsByUser = new Map(
        (settingsRows ?? []).map((s) => [s.user_id as string, s]),
      );
    }

    for (const row of list) {
      const priority = row.priority as string | undefined;
      const st = settingsByUser.get(row.user_id as string);

      if (!isCriticalNotification(priority)) {
        const qs = st?.quiet_hours_start;
        const qe = st?.quiet_hours_end;
        if (qs != null && qe != null && String(qs).trim() !== "" && String(qe).trim() !== "") {
          const now = new Date();
          if (isInQuietHours({ now, tz, startStr: String(qs), endStr: String(qe) })) {
            const nextIso = computeNextSendAfterQuietHours({
              now,
              tz,
              startStr: String(qs),
              endStr: String(qe),
            });
            if (nextIso) {
              const { error: upQ } = await supabase
                .from("notifications")
                .update({ scheduled_for: nextIso })
                .eq("id", row.id as string);
              if (upQ) {
                console.error("[process-scheduled-notifications] reschedule quiet_hours:", upQ);
                failed++;
              } else {
                deferredQuietHours++;
              }
              continue;
            }
          }
        }
      }

      if (!isCriticalNotification(priority)) {
        const limit = effectiveDailyLimit(
          st?.max_daily_notifications as number | null | undefined,
        );
        const { data: dailyCnt, error: rpcErr } = await supabase.rpc(
          "check_notification_daily_limit",
          { p_user_id: row.user_id as string, p_tz: tz },
        );
        if (rpcErr) {
          console.error("[process-scheduled-notifications] check_notification_daily_limit:", rpcErr);
        } else {
          const c = typeof dailyCnt === "number" ? dailyCnt : 0;
          if (shouldDiscardForDailyLimit(c, limit, false)) {
            const { error: derr } = await supabase
              .from("notifications")
              .update({
                discarded_at: new Date().toISOString(),
                discard_reason: "daily_limit",
              })
              .eq("id", row.id as string);
            if (derr) {
              console.error("[process-scheduled-notifications] discard daily_limit:", derr);
              failed++;
            } else {
              discardedDailyLimit++;
            }
            continue;
          }
        }
      }

      const webhookBody = {
        type: "INSERT" as const,
        table: "notifications",
        schema: "public",
        record: row,
        old_record: null,
      };

      const pushUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/send-web-push`;
      const res = await fetch(pushUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify(webhookBody),
      });

      const resText = await res.text();
      let body: {
        discarded?: boolean;
        reason?: string;
        deferred?: boolean;
        delivered_in_app_only?: boolean;
      } = {};
      try {
        body = JSON.parse(resText) as typeof body;
      } catch {
        /* ignore */
      }

      if (!res.ok) {
        console.error("[process-scheduled-notifications] send-web-push HTTP", res.status, resText);
        failed++;
        continue;
      }

      if (body.discarded === true && body.reason === "daily_limit") {
        discardedDailyLimit++;
        continue;
      }

      if (body.deferred === true) {
        continue;
      }

      if (body.delivered_in_app_only === true) {
        deliveredInAppOnly++;
        continue;
      }

      processed++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        due: list.length,
        processed,
        failed,
        deferred_quiet_hours: deferredQuietHours,
        discarded_daily_limit: discardedDailyLimit,
        delivered_in_app_only: deliveredInAppOnly,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[process-scheduled-notifications]", e);
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
