/**
 * Envia notificações por Push (navegador), E-mail (Resend) e SMS (Twilio)
 * quando uma linha é inserida em `notifications`.
 * Invocado por Database Webhook: tabela `notifications`, evento Insert.
 *
 * Secrets: VAPID_KEYS (push); e-mail: SENDGRID_API_KEY + SENDGRID_FROM ou RESEND_API_KEY + RESEND_FROM; TWILIO_* (SMS).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as webpush from "jsr:@negrel/webpush@0.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  effectiveDailyLimit,
  shouldDiscardForDailyLimit,
} from "../_shared/daily-limit.ts";
import { resolveChannelFlags } from "../_shared/notification-channels.ts";
import {
  computeNextSendAfterQuietHours,
  DEFAULT_QUIET_HOURS_TZ,
  isCriticalNotification,
  isInQuietHours,
} from "../_shared/quiet-hours.ts";

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
    metadata?: { appUrl?: string | null } | null;
    scheduled_for?: string | null;
    push_delivered_at?: string | null;
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

    const scheduledForRaw = record.scheduled_for;
    if (scheduledForRaw) {
      const t = new Date(scheduledForRaw).getTime();
      if (!Number.isNaN(t) && t > Date.now()) {
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            reason: "scheduled_for_future",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from("notification_settings")
      .select(
        "push_enabled, email_enabled, sms_enabled, quiet_hours_start, quiet_hours_end, max_daily_notifications",
      )
      .eq("user_id", userId)
      .maybeSingle();

    const tz = Deno.env.get("NOTIFICATION_QUIET_HOURS_TZ")?.trim() || DEFAULT_QUIET_HOURS_TZ;
    if (!isCriticalNotification(record.priority) && record.id) {
      const qs = settings?.quiet_hours_start;
      const qe = settings?.quiet_hours_end;
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
            const { error: deferErr } = await supabase
              .from("notifications")
              .update({ scheduled_for: nextIso })
              .eq("id", record.id);
            if (deferErr) {
              console.error("[send-web-push] quiet_hours reschedule:", deferErr);
              return new Response(JSON.stringify({ success: false, error: deferErr.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            return new Response(
              JSON.stringify({
                success: true,
                deferred: true,
                reason: "quiet_hours",
                scheduled_for: nextIso,
                push: 0,
                expo: 0,
                email: 0,
                sms: 0,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }

    if (!isCriticalNotification(record.priority) && record.id) {
      const limit = effectiveDailyLimit(settings?.max_daily_notifications ?? null);
      const { data: dailyCnt, error: dailyRpcErr } = await supabase.rpc(
        "check_notification_daily_limit",
        { p_user_id: userId, p_tz: tz },
      );
      if (dailyRpcErr) {
        console.error("[send-web-push] check_notification_daily_limit:", dailyRpcErr);
      } else {
        const c = typeof dailyCnt === "number" ? dailyCnt : 0;
        if (shouldDiscardForDailyLimit(c, limit, false)) {
          const { error: dErr } = await supabase
            .from("notifications")
            .update({
              discarded_at: new Date().toISOString(),
              discard_reason: "daily_limit",
            })
            .eq("id", record.id);
          if (dErr) {
            console.error("[send-web-push] daily_limit discard:", dErr);
            return new Response(JSON.stringify({ success: false, error: dErr.message }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          return new Response(
            JSON.stringify({
              success: true,
              discarded: true,
              reason: "daily_limit",
              push: 0,
              expo: 0,
              email: 0,
              sms: 0,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const ch = resolveChannelFlags(settings);
    if (!ch.anyExternalChannelEnabled && ch.hasSettingsRow && record.id) {
      const iso = new Date().toISOString();
      const { error: inAppErr } = await supabase
        .from("notifications")
        .update({
          push_delivered_at: iso,
          delivered_in_app_only: true,
        })
        .eq("id", record.id);
      if (inAppErr) {
        console.error("[send-web-push] delivered_in_app_only:", inAppErr);
        return new Response(JSON.stringify({ success: false, error: inAppErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          success: true,
          delivered_in_app_only: true,
          push: 0,
          expo: 0,
          email: 0,
          sms: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pushEnabled = ch.pushEnabled;
    const emailEnabled = ch.emailEnabled;
    const smsEnabled = ch.smsEnabled;

    let userEmail: string | null = null;
    let userPhone: string | null = null;
    let expoPushToken: string | null = null;

    if (pushEnabled || emailEnabled || smsEnabled) {
      const [{ data: profile }, { data: authUser }] = await Promise.all([
        supabase.from("profiles").select("phone, expo_push_token").eq("id", userId).maybeSingle(),
        supabase.auth.admin.getUserById(userId),
      ]);
      userEmail = authUser?.user?.email ?? null;
      userPhone = toE164(profile?.phone ?? null);
      expoPushToken = profile?.expo_push_token ?? null;
    }

    let pushSent = 0;
    let emailSent = 0;
    let smsSent = 0;
    let expoSent = 0;

    // --- Push (navegador Web) ---
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

      // --- Push (app mobile Expo) — aparece na bandeja do celular ---
      if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken")) {
        if (
          pushEnabled &&
          (record.type === "audiencia_lembrete_1h" ||
            record.type === "audiencia_lembrete_1min" ||
            record.type === "audiencia_lembrete_d1" ||
            record.type === "visita_avaliacao_pos_saida" ||
            record.type === "evaluation_reminder")
        ) {
          console.warn("[notification-delivery] Push na bandeja não enviado: expo_push_token ausente ou inválido no perfil. Usuário deve abrir o app ao menos uma vez (com permissão de notificação) para o token ser salvo.", { user_id: userId, type: record.type });
        }
      } else {
        try {
          const isHighPriority = record.priority === "high";
          const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Accept-Encoding": "gzip, deflate",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: expoPushToken,
              title: record.title,
              body: record.message,
              sound: "default",
              channelId: "default",
              priority: isHighPriority ? "high" : "default",
              data: {
                url: record.action_url || "/",
                id: record.id,
                type: record.type,
              },
            }),
          });
          const expoBody = await expoRes.text();
          if (expoRes.ok) {
            try {
              const expoJson = JSON.parse(expoBody) as {
                data?: Array<{ status: string; message?: string }> | { status: string; message?: string };
              };
              const data = expoJson.data;
              const first = Array.isArray(data) ? data[0] : (data as { status?: string; message?: string } | undefined);
              const status = first?.status;
              if (status === "ok") {
                expoSent = 1;
              } else {
                console.warn("[notification-delivery] Expo push ticket error:", first?.message ?? expoBody);
              }
            } catch {
              console.warn("[notification-delivery] Expo push response (not JSON):", expoBody);
            }
          } else {
            console.warn("[notification-delivery] Expo push HTTP error:", expoRes.status, expoBody);
          }
        } catch (e) {
          console.warn("[notification-delivery] Expo push error:", e);
        }
      }
    }

    // --- E-mail (SendGrid ou Resend) ---
    if (emailEnabled && userEmail) {
      if (record.type === "audiencia_inscricao") {
        // Confirmação completa vai para o e-mail do formulário (send-audiencia-inscricao-email).
        // Aqui o destino seria auth.users.email — incorreto quando o contato é outro endereço.
        console.log("[notification-delivery] E-mail genérico omitido (audiencia_inscricao); confirmação via send-audiencia-inscricao-email");
      } else {
      const metadataAppUrl =
        typeof record.metadata?.appUrl === "string" ? record.metadata.appUrl.trim() : "";
      const appUrl = (metadataAppUrl || Deno.env.get("APP_URL") || "").replace(/\/$/, "");
      const actionUrl = record.action_url
        ? (record.action_url.startsWith("http") ? record.action_url : appUrl ? `${appUrl}${record.action_url}` : record.action_url)
        : appUrl || "#";
      const linkLabel =
        record.type === "export_completed" ? "Abrir exportações e baixar" : "Abrir no app";
      const htmlBody = `<p>${record.message.replace(/</g, "&lt;")}</p><p><a href="${actionUrl}">${linkLabel}</a></p>`;

      // SendGrid (prioridade se configurado)
      const sendgridKey = Deno.env.get("SENDGRID_API_KEY");
      const sendgridFrom = Deno.env.get("SENDGRID_FROM");
      if (sendgridKey && sendgridFrom && emailSent === 0) {
        try {
          const fromMatch = sendgridFrom.match(/^(.+?)\s*<([^>]+)>$/);
          const fromEmail = fromMatch ? fromMatch[2].trim() : sendgridFrom;
          const fromName = fromMatch ? fromMatch[1].trim() : "Câmara na Mão";
          const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${sendgridKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: userEmail }], subject: record.title }],
              from: { email: fromEmail, name: fromName },
              content: [{ type: "text/html", value: htmlBody }],
            }),
          });
          if (res.ok) emailSent = 1;
          else console.warn("[notification-delivery] SendGrid error:", res.status, await res.text());
        } catch (e) {
          console.warn("[notification-delivery] SendGrid error:", e);
        }
      }

      // Resend (fallback se SendGrid não configurado ou falhou)
      if (emailSent === 0) {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        const resendFrom = Deno.env.get("RESEND_FROM");
        if (resendKey && resendFrom) {
          try {
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
                html: htmlBody,
              }),
            });
            if (res.ok) emailSent = 1;
            else console.warn("[notification-delivery] Resend error:", await res.text());
          } catch (e) {
            console.warn("[notification-delivery] Email error:", e);
          }
        }
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

    if (record.id) {
      const { error: pdErr } = await supabase
        .from("notifications")
        .update({
          push_delivered_at: new Date().toISOString(),
          delivered_in_app_only: false,
        })
        .eq("id", record.id);
      if (pdErr) {
        console.error("[send-web-push] push_delivered_at:", pdErr);
        return new Response(JSON.stringify({ success: false, error: pdErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        delivered_in_app_only: false,
        push: pushSent,
        expo: expoSent,
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
