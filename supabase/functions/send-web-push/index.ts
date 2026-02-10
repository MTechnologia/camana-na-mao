/**
 * Envia notificações por Push (navegador), E-mail (Resend) e SMS (Twilio)
 * quando uma linha é inserida em `notifications`.
 * Invocado por Database Webhook: tabela `notifications`, evento Insert.
 *
 * Secrets: VAPID_KEYS (push); RESEND_API_KEY + RESEND_FROM (e-mail); TWILIO_* (SMS).
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

/** Normaliza telefone para E.164 (ex.: Brasil +55). */
function toE164(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== "string") return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10 || digits.length === 11) return "+55" + digits;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return "+" + digits;
  return "+" + digits;
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
        JSON.stringify({ success: true, push: 0, email: 0, sms: 0, reason: "no_user_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from("notification_settings")
      .select("push_enabled, email_enabled, sms_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    const pushEnabled = settings?.push_enabled !== false;
    const emailEnabled = settings?.email_enabled === true;
    const smsEnabled = settings?.sms_enabled === true;

    let userEmail: string | null = null;
    let userPhone: string | null = null;

    if (emailEnabled || smsEnabled) {
      const [{ data: profile }, { data: authUser }] = await Promise.all([
        supabase.from("profiles").select("phone").eq("id", userId).maybeSingle(),
        supabase.auth.admin.getUserById(userId),
      ]);
      userEmail = authUser?.user?.email ?? null;
      userPhone = toE164(profile?.phone ?? null);
    }

    let pushSent = 0;
    let emailSent = 0;
    let smsSent = 0;

    // --- Push ---
    if (pushEnabled) {
      const vapidKeysJson = Deno.env.get("VAPID_KEYS");
      const { data: subscriptions, error: subError } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh_key, auth_key")
        .eq("user_id", userId);

      if (vapidKeysJson && !subError && subscriptions?.length) {
        try {
          const vapidKeys = await webpush.importVapidKeys(JSON.parse(vapidKeysJson), {
            extractable: false,
          });
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
          const toRemove: string[] = [];
          for (const sub of subscriptions) {
            try {
              const subscription = {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
              };
              const subscriber = appServer.subscribe(subscription);
              await subscriber.pushTextMessage(pushPayload, {});
              pushSent++;
            } catch (err) {
              const msg = (err as Error).message || String(err);
              if (msg.includes("410") || msg.includes("404") || msg.includes("Gone")) {
                toRemove.push(sub.id);
              }
            }
          }
          if (toRemove.length > 0) {
            await supabase.from("push_subscriptions").delete().in("id", toRemove);
          }
        } catch (e) {
          console.warn("[notification-delivery] Push error:", e);
        }
      }
    }

    // --- E-mail (Resend) ---
    if (emailEnabled && userEmail) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const resendFrom = Deno.env.get("RESEND_FROM");
      if (resendKey && resendFrom) {
        try {
          const appUrl = Deno.env.get("APP_URL") || "";
          const actionUrl = record.action_url
            ? (record.action_url.startsWith("http") ? record.action_url : appUrl ? `${appUrl}${record.action_url}` : record.action_url)
            : appUrl || "#";
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: resendFrom,
              to: [userEmail],
              subject: record.title,
              html: `<p>${record.message.replace(/</g, "&lt;")}</p><p><a href="${actionUrl}">Abrir no app</a></p>`,
            }),
          });
          if (res.ok) emailSent = 1;
          else console.warn("[notification-delivery] Resend error:", await res.text());
        } catch (e) {
          console.warn("[notification-delivery] Email error:", e);
        }
      }
    }

    // --- SMS (Twilio) ---
    if (smsEnabled && userPhone) {
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const token = Deno.env.get("TWILIO_AUTH_TOKEN");
      const from = Deno.env.get("TWILIO_FROM_NUMBER");
      if (sid && token && from) {
        try {
          const body = new URLSearchParams({
            To: userPhone,
            From: from,
            Body: `${record.title}: ${record.message}`.slice(0, 1600),
          });
          const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: "Basic " + btoa(`${sid}:${token}`),
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: body.toString(),
            }
          );
          if (res.ok) smsSent = 1;
          else console.warn("[notification-delivery] Twilio error:", await res.text());
        } catch (e) {
          console.warn("[notification-delivery] SMS error:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        push: pushSent,
        email: emailSent,
        sms: smsSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[notification-delivery]", e);
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
