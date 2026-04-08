/**
 * RN-AVA-002: visitas pending sem avaliação — lembrete entre 24h e 48h (evaluation_reminder);
 * expira pending com 48h+ sem rating. Rodar ~2x/dia (8h e 14h, ex. Cloud Scheduler).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const BATCH = 200;

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

    const cutoff48 = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const cutoff24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredCount, error: expErr } = await supabase.rpc("expire_pending_visits_over_48h");
    if (expErr) {
      console.error("[process-pending-visits] expire_pending_visits_over_48h:", expErr);
      return new Response(JSON.stringify({ success: false, error: expErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const expired = typeof expiredCount === "number" ? expiredCount : 0;

    const { data: candidates, error: selErr } = await supabase
      .from("service_visits")
      .select("id, user_id, service_id, created_at, public_services(name)")
      .eq("status", "pending")
      .eq("reminder_sent", false)
      .lte("created_at", cutoff24)
      .gt("created_at", cutoff48)
      .limit(BATCH);

    if (selErr) {
      console.error("[process-pending-visits] select candidates:", selErr);
      return new Response(JSON.stringify({ success: false, error: selErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = candidates ?? [];
    const ids = rows.map((r) => r.id as string);
    let reminders = 0;
    let reminderFailed = 0;

    if (ids.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          expired,
          reminders: 0,
          reminder_failed: 0,
          candidates: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: ratedRows, error: ratErr } = await supabase
      .from("service_ratings")
      .select("visit_id")
      .in("visit_id", ids);

    if (ratErr) {
      console.error("[process-pending-visits] ratings lookup:", ratErr);
      return new Response(JSON.stringify({ success: false, error: ratErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ratedSet = new Set((ratedRows ?? []).map((r) => r.visit_id as string));

    for (const row of rows) {
      const visitId = row.id as string;
      if (ratedSet.has(visitId)) continue;

      const ps = row.public_services as { name: string } | null;
      const svcName = ps?.name?.trim() || "serviço visitado";

      const { error: insErr } = await supabase.from("notifications").insert({
        user_id: row.user_id as string,
        title: "Ainda dá tempo de avaliar",
        message: `Você visitou ${svcName} e ainda não enviou sua avaliação. Ajude a cidade com sua opinião.`,
        type: "evaluation_reminder",
        action_url: `/avaliar/${visitId}`,
        priority: "normal",
        metadata: {
          service_visit_id: visitId,
          service_id: row.service_id as string,
        },
      });

      if (insErr) {
        console.error("[process-pending-visits] notification insert:", insErr);
        reminderFailed++;
        continue;
      }

      const { error: upErr } = await supabase
        .from("service_visits")
        .update({ reminder_sent: true, updated_at: new Date().toISOString() })
        .eq("id", visitId)
        .eq("reminder_sent", false);

      if (upErr) {
        console.error("[process-pending-visits] reminder_sent update:", upErr);
        reminderFailed++;
        continue;
      }

      reminders++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        expired,
        reminders,
        reminder_failed: reminderFailed,
        candidates: rows.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[process-pending-visits]", e);
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
