/**
 * Envia Web Push ao navegador quando uma linha é inserida em `notifications`.
 * Deve ser invocado por Database Webhook: tabela `notifications`, evento Insert.
 *
 * Requer secret: VAPID_KEYS (JSON gerado por generate-vapid-keys).
 * Opcional: PUSH_ADMIN_EMAIL (ex.: mailto:suporte@exemplo.org).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as webpush from "jsr:@negrel/webpush@0.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type?: string;
    action_url?: string | null;
    priority?: string;
  };
  old_record: unknown;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT" || payload.table !== "notifications") {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "not_notification_insert" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const record = payload.record;
    const userId = record.user_id;
    if (!userId) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "no_user_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapidKeysJson = Deno.env.get("VAPID_KEYS");
    if (!vapidKeysJson) {
      console.warn("[send-web-push] VAPID_KEYS não configurado; push não enviado.");
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "vapid_not_configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from("notification_settings")
      .select("push_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (settings && settings.push_enabled === false) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "push_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh_key, auth_key")
      .eq("user_id", userId);

    if (subError || !subscriptions?.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "no_subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapidKeys = await webpush.importVapidKeys(JSON.parse(vapidKeysJson), { extractable: false });
    const adminEmail = Deno.env.get("PUSH_ADMIN_EMAIL") || "mailto:support@example.com";
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: adminEmail,
      vapidKeys,
    });

    const pushPayload = JSON.stringify({
      title: record.title,
      body: record.message,
      url: record.action_url || "/",
      id: record.id,
    });

    let sent = 0;
    const toRemove: string[] = [];

    for (const sub of subscriptions) {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
        };
        const subscriber = appServer.subscribe(subscription);
        await subscriber.pushTextMessage(pushPayload, {});
        sent++;
      } catch (err) {
        const msg = (err as Error).message || String(err);
        console.warn("[send-web-push] Falha ao enviar para subscription", sub.id, msg);
        if (msg.includes("410") || msg.includes("404") || msg.includes("Gone")) {
          toRemove.push(sub.id);
        }
      }
    }

    if (toRemove.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", toRemove);
    }

    return new Response(
      JSON.stringify({ success: true, sent, removed: toRemove.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[send-web-push]", e);
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
