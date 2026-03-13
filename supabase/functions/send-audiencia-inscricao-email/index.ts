/**
 * Envia e-mail de confirmação de inscrição em audiência pública (videoconferência ou escrito).
 * Invocado por Database Webhook: tabela audiencia_participacoes, evento INSERT.
 *
 * Além do usuário inscrito, envia cópia para: sgp1@saopaulo.sp.leg.br e testes.mtech.2025@gmail.com.
 *
 * Remetente: AUDIENCIA_EMAIL_FROM (ex.: "Câmara Municipal de São Paulo <noreply@saopaulo.sp.leg.br>")
 *            ou fallback SENDGRID_FROM / RESEND_FROM.
 *
 * Secrets: SENDGRID_API_KEY + SENDGRID_FROM ou RESEND_API_KEY + RESEND_FROM;
 *          opcional: AUDIENCIA_EMAIL_FROM para remetente específico das audiências.
 */

/** E-mails que recebem cópia de toda confirmação de inscrição via app (Câmara na Mão). */
const CONFIRMATION_CC_EMAILS = [
  "sgp1@saopaulo.sp.leg.br",
  "testes.mtech.2025@gmail.com",
];

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParticipacaoRecord {
  id: string;
  audiencia_id: string;
  tipo: string;
  nome: string;
  email: string;
  telefone: string;
  protocolo?: number | null;
  entidade?: string | null;
  funcao?: string | null;
  bairro?: string | null;
  sugestao?: string | null;
}

interface AudienciaRow {
  titulo: string;
  data: string;
  hora: string | null;
  comissao: string | null;
  link_transmissao: string | null;
  ap_code: string | null;
  mais_informacoes: string | null;
}

interface WebhookPayload {
  type: string;
  table: string;
  schema: string;
  record: ParticipacaoRecord;
  old_record: unknown;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDataHora(data: string, hora: string | null): string {
  if (!data) return "";
  const d = data.slice(0, 10);
  if (hora && hora.length >= 8) return `${d} ${hora.slice(0, 8)}`;
  return d;
}

function buildHtmlEmail(
  record: ParticipacaoRecord,
  audiencia: AudienciaRow | null,
  appUrl: string
): { subject: string; html: string } {
  const tipo = record.tipo === "escrito" ? "escrito" : "videoconferencia";
  const apCode = audiencia?.ap_code ?? "—";
  const dataHora = audiencia ? formatDataHora(audiencia.data, audiencia.hora) : "";
  const contactEmail = audiencia?.mais_informacoes?.match(/[\w.+%-]+@[\w.-]+\.[a-zA-Z]{2,}/)?.[0] ?? null;
  const telefoneDigits = (record.telefone || "").replace(/\D/g, "");

  const subject =
    tipo === "escrito"
      ? `CMSP | Audiências Públicas | Manifestação submetida ${apCode}`
      : `CMSP | Audiências Públicas | Inscrição submetida ${apCode}`;

  let body = "";
  body += "<p><strong>Registramos sua " + (tipo === "escrito" ? "manifestação por escrito." : "inscrição.") + "</strong></p>";
  if (tipo === "videoconferencia" && audiencia?.comissao) {
    body += "<p>Obrigado por se inscrever para participar de Audiência Pública a ser realizada pela " + escapeHtml(audiencia.comissao) + ".</p>";
  }
  if (record.protocolo != null) {
    body += "<p>O seu número de protocolo é <strong>" + String(record.protocolo) + "</strong>.</p>";
  }
  if (tipo === "videoconferencia") {
    body +=
      "<p>Lembramos que em virtude da natureza do evento, da quantidade de inscritos e da limitação de tempo de transmissão, a inscrição não garante <strong>necessariamente</strong> o direito à fala na audiência pública.</p>";
    if (audiencia?.link_transmissao?.trim()) {
      body +=
        "<p>Alguns minutos antes do horário agendado, acesse <a href=\"" +
        escapeHtml(audiencia.link_transmissao) +
        "\">este link</a> para participar da audiência pública por videoconferência e fazer sua fala.</p>";
    }
  }
  if (contactEmail) {
    body +=
      "<p>Para maiores informações, entre em contato com a Secretaria da Comissão responsável: <strong>" +
      escapeHtml(contactEmail) +
      "</strong></p>";
  }
  body += "<p><strong>Audiência Pública:</strong> " + escapeHtml(apCode) + (dataHora ? " | " + escapeHtml(dataHora) : "") + "</p>";
  body +=
    "<p>" +
    escapeHtml(record.nome) +
    " (" +
    escapeHtml(record.email) +
    " | " +
    escapeHtml(telefoneDigits) +
    ")</p>";
  if (appUrl) {
    body += '<p><a href="' + escapeHtml(appUrl) + '/audiencias">Abrir audiências no app</a></p>';
  }
  body += "<p style=\"color:#666;font-size:12px;\">Não responda este e-mail. Esta é uma mensagem gerada automaticamente.</p>";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family: sans-serif; line-height: 1.5; color: #333; max-width: 600px;">
  <div style="background: #22c55e; color: #fff; text-align: center; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
    <p style="margin:0; font-weight: bold; font-size: 18px; text-transform: uppercase;">
      ${tipo === "escrito" ? "Manifestação enviada com sucesso!" : "Inscrição realizada com sucesso!"}
    </p>
  </div>
  <div>${body}</div>
</body>
</html>`;

  return { subject, html };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = (await req.json()) as WebhookPayload;
    if (payload.type !== "INSERT" || payload.table !== "audiencia_participacoes") {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "not_participacao_insert" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const record = payload.record as ParticipacaoRecord;
    const toEmail = typeof record.email === "string" ? record.email.trim() : "";
    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: audiencia } = await supabase
      .from("audiencias")
      .select("titulo, data, hora, comissao, link_transmissao, ap_code, mais_informacoes")
      .eq("id", record.audiencia_id)
      .maybeSingle();

    const appUrl = (Deno.env.get("APP_URL") || "").replace(/\/$/, "");
    const { subject, html } = buildHtmlEmail(record, audiencia as AudienciaRow | null, appUrl);

    const fromAudiencia = Deno.env.get("AUDIENCIA_EMAIL_FROM");
    const sendgridKey = Deno.env.get("SENDGRID_API_KEY");
    const sendgridFrom = Deno.env.get("SENDGRID_FROM");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = Deno.env.get("RESEND_FROM");

    const fromFinal = fromAudiencia?.trim() || sendgridFrom?.trim() || resendFrom?.trim();
    if (!fromFinal) {
      console.warn("[send-audiencia-inscricao-email] No FROM configured (AUDIENCIA_EMAIL_FROM, SENDGRID_FROM or RESEND_FROM)");
      return new Response(
        JSON.stringify({ success: true, email_sent: false, reason: "no_from_configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const fromMatch = fromFinal.match(/^(.+?)\s*<([^>]+)>$/);
    const fromName = fromMatch ? fromMatch[1].trim() : "Câmara na Mão";
    const fromEmail = fromMatch ? fromMatch[2].trim() : fromFinal;

    let emailSent = false;

    const ccEmails = CONFIRMATION_CC_EMAILS.filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (sendgridKey && (sendgridFrom || fromAudiencia)) {
      try {
        const personalization: { to: { email: string }[]; subject: string; cc?: { email: string }[] } = {
          to: [{ email: toEmail }],
          subject,
        };
        if (ccEmails.length > 0) personalization.cc = ccEmails.map((email) => ({ email }));
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sendgridKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [personalization],
            from: { email: fromEmail, name: fromName },
            content: [{ type: "text/html", value: html }],
          }),
        });
        if (res.ok) emailSent = true;
        else console.warn("[send-audiencia-inscricao-email] SendGrid error:", res.status, await res.text());
      } catch (e) {
        console.warn("[send-audiencia-inscricao-email] SendGrid error:", e);
      }
    }

    if (!emailSent && resendKey) {
      try {
        const toList = [toEmail, ...ccEmails];
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromFinal,
            to: toList,
            subject,
            html,
          }),
        });
        if (res.ok) emailSent = true;
        else console.warn("[send-audiencia-inscricao-email] Resend error:", await res.text());
      } catch (e) {
        console.warn("[send-audiencia-inscricao-email] Resend error:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, email_sent: emailSent, to: toEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    console.error("[send-audiencia-inscricao-email]", e);
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
