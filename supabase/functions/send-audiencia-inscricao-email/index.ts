/**
 * Envia e-mail de confirmação de inscrição em audiência pública (videoconferência ou escrito).
 * Invocado por Database Webhook: tabela audiencia_participacoes, evento INSERT.
 *
 * Usuário inscrito: recebe e-mail de confirmação ("Registramos sua inscrição", protocolo, link etc.).
 * Admin (CC): recebe e-mail de notificação separado ("Nova inscrição recebida", audiência, data, protocolo, dados do inscrito).
 * Endereços admin: sgp1@saopaulo.sp.leg.br, testes.mtech.2025@gmail.com.
 *
 * Remetente: AUDIENCIA_EMAIL_FROM (ex.: "Câmara Municipal de São Paulo <noreply@saopaulo.sp.leg.br>")
 *            ou fallback SENDGRID_FROM / RESEND_FROM.
 *
 * Secrets: SENDGRID_API_KEY + SENDGRID_FROM ou RESEND_API_KEY + RESEND_FROM;
 *          opcional: AUDIENCIA_EMAIL_FROM para remetente específico das audiências.
 */

/** E-mails que recebem notificação de nova inscrição (e-mail específico para admin, não cópia do usuário). */
const ADMIN_NOTIFICATION_EMAILS = [
  "sgp1@saopaulo.sp.leg.br",
  "testes.mtech.2025@gmail.com",
];

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";

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
  id?: string;
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

const AP_CODE_COMMISSION_HINTS: Record<string, string[]> = {
  ECON: ["economia", "desenvolvimento economico", "turismo", "transito", "transporte", "atividade economica"],
  FIN: ["financas", "orcamento"],
  SAUDE: ["saude", "promocao social", "trabalho", "mulher"],
  TRANS: ["transito", "transporte", "atividade economica", "turismo", "lazer"],
  EDUC: ["educacao", "cultura", "esportes"],
  URB: ["politica urbana", "metropolitana", "meio ambiente"],
  ADM: ["administracao publica"],
  CONST: ["constituicao", "justica", "legislacao"],
  EXTRA: ["extraordinaria"],
};

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function apCodePrefix(apCode?: string | null): string {
  return (apCode ?? "").split("-")[0]?.replace(/\d+$/g, "").toUpperCase() ?? "";
}

function expectedApCodePrefix(audiencia: AudienciaRow): string | null {
  const text = normalizeForMatch(`${audiencia.comissao ?? ""} ${audiencia.titulo ?? ""}`);
  if (!text) return null;
  for (const [prefix, hints] of Object.entries(AP_CODE_COMMISSION_HINTS)) {
    if (hints.some((hint) => text.includes(hint))) return prefix;
  }
  return null;
}

function scoreAudienciaForApCode(audiencia: AudienciaRow, apCode?: string | null): number {
  const prefix = apCodePrefix(apCode);
  if (!prefix) return 0;
  const text = normalizeForMatch(`${audiencia.comissao ?? ""} ${audiencia.titulo ?? ""}`);
  if (!text) return 0;

  const hints = AP_CODE_COMMISSION_HINTS[prefix] ?? [];
  if (hints.some((hint) => text.includes(hint))) return 20;

  const normalizedPrefix = normalizeForMatch(prefix);
  if (normalizedPrefix.length >= 3 && text.includes(normalizedPrefix)) return 10;

  return 0;
}

function isAudienciaConsistentWithApCode(audiencia: AudienciaRow): boolean {
  const apCode = audiencia.ap_code?.trim();
  if (!apCode) return true;
  return scoreAudienciaForApCode(audiencia, apCode) > 0;
}

function sameNormalizedText(a?: string | null, b?: string | null): boolean {
  const aNorm = normalizeForMatch(a ?? "");
  const bNorm = normalizeForMatch(b ?? "");
  return !!aNorm && aNorm === bNorm;
}

function apCodeDateSuffix(data?: string | null): string | null {
  const date = (data ?? "").slice(0, 10);
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

function displayApCode(audiencia: AudienciaRow | null): string {
  if (!audiencia) return "—";
  const rawApCode = audiencia.ap_code?.trim() ?? "";
  if (rawApCode && isAudienciaConsistentWithApCode(audiencia)) return rawApCode;

  const expectedPrefix = expectedApCodePrefix(audiencia);
  if (!expectedPrefix) return rawApCode || "—";

  const rawSuffix = rawApCode.match(/^[A-Z]+(\d+-\d{2}-\d{2}-\d{4}(?:-\d+h)?)$/i)?.[1];
  if (rawSuffix) return `${expectedPrefix}${rawSuffix}`;

  const dateSuffix = apCodeDateSuffix(audiencia.data);
  return dateSuffix ? `${expectedPrefix}-${dateSuffix}` : expectedPrefix;
}

async function resolveAudienciaForEmail(
  supabase: ReturnType<typeof createClient>,
  audiencia: AudienciaRow | null,
): Promise<AudienciaRow | null> {
  if (!audiencia) return null;

  const needsLookup = !audiencia.ap_code?.trim() || !isAudienciaConsistentWithApCode(audiencia);
  if (!needsLookup || !audiencia.data) return audiencia;

  let query = supabase
    .from("audiencias")
    .select("id, titulo, data, hora, comissao, link_transmissao, ap_code, mais_informacoes")
    .eq("data", audiencia.data);
  query = audiencia.hora ? query.eq("hora", audiencia.hora) : query.is("hora", null);

  const { data: candidates } = await query;
  const rows = ((candidates ?? []) as AudienciaRow[]).filter((row) => row.id !== audiencia.id);

  const withSameNameAndApCode = rows.find((row) =>
    row.ap_code?.trim() &&
    isAudienciaConsistentWithApCode(row) &&
    (sameNormalizedText(row.comissao, audiencia.comissao) || sameNormalizedText(row.titulo, audiencia.titulo))
  );

  return withSameNameAndApCode ?? audiencia;
}

/** Bloco HTML com o texto da manifestação por escrito (quebras de linha preservadas). */
function manifestacaoEscritoHtml(record: ParticipacaoRecord): string {
  const sug = (record.sugestao ?? "").trim();
  const bairro = (record.bairro ?? "").trim();
  let block = "";
  if (sug) {
    block +=
      "<p><strong>Texto da sua manifestação</strong></p>" +
      "<div style=\"margin:12px 0;padding:12px 14px;background:#f4f4f5;border-radius:8px;border-left:4px solid #22c55e;white-space:pre-wrap;word-break:break-word;\">" +
      escapeHtml(sug) +
      "</div>";
  }
  if (bairro) {
    block += "<p><strong>Bairro (subprefeitura) informado:</strong> " + escapeHtml(bairro) + "</p>";
  }
  return block;
}

function manifestacaoEscritoAdminHtml(record: ParticipacaoRecord): string {
  const sug = (record.sugestao ?? "").trim();
  const bairro = (record.bairro ?? "").trim();
  let block = "";
  if (sug) {
    block +=
      "<p><strong>Texto da manifestação</strong></p>" +
      "<div style=\"margin:12px 0;padding:12px 14px;background:#f1f5f9;border-radius:8px;border-left:4px solid #1e40af;white-space:pre-wrap;word-break:break-word;\">" +
      escapeHtml(sug) +
      "</div>";
  }
  if (bairro) {
    block += "<p><strong>Bairro (subprefeitura):</strong> " + escapeHtml(bairro) + "</p>";
  }
  return block;
}

function buildHtmlEmail(
  record: ParticipacaoRecord,
  audiencia: AudienciaRow | null,
  appUrl: string
): { subject: string; html: string } {
  const tipo = record.tipo === "escrito" ? "escrito" : "videoconferencia";
  const apCode = displayApCode(audiencia);
  const dataHora = audiencia ? formatDataHora(audiencia.data, audiencia.hora) : "";
  const contactEmail = audiencia?.mais_informacoes?.match(/[\w.+%-]+@[\w.-]+\.[a-zA-Z]{2,}/)?.[0] ?? null;
  const telefoneDigits = (record.telefone || "").replace(/\D/g, "");

  const subject =
    tipo === "escrito"
      ? `CMSP | Audiências Públicas | Manifestação submetida ${apCode}`
      : `CMSP | Audiências Públicas | Inscrição submetida ${apCode}`;

  let body = "";
  body += "<p><strong>Registramos sua " + (tipo === "escrito" ? "manifestação por escrito." : "inscrição.") + "</strong></p>";
  if (tipo === "escrito") {
    body += manifestacaoEscritoHtml(record);
  }
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

/** E-mail de notificação para admin (CC): informa que um usuário se inscreveu, sem tom de confirmação ao usuário. */
function buildAdminNotificationEmail(
  record: ParticipacaoRecord,
  audiencia: AudienciaRow | null,
  appUrl: string
): { subject: string; html: string } {
  const tipo = record.tipo === "escrito" ? "escrito" : "videoconferencia";
  const apCode = displayApCode(audiencia);
  const dataHora = audiencia ? formatDataHora(audiencia.data, audiencia.hora) : "";
  const comissaoOuTitulo = audiencia?.comissao?.trim() || audiencia?.titulo?.trim() || "—";
  const telefoneDigits = (record.telefone || "").replace(/\D/g, "");

  const subject =
    tipo === "escrito"
      ? `CMSP | Audiências Públicas | Nova manifestação recebida ${apCode}`
      : `CMSP | Audiências Públicas | Nova inscrição recebida ${apCode}`;

  let body = "";
  body += "<p><strong>Foi registrada uma nova " + (tipo === "escrito" ? "manifestação por escrito" : "inscrição") + " para audiência pública.</strong></p>";
  body += "<p>Esta " + (tipo === "escrito" ? "manifestação" : "inscrição") + " foi realizada pelo aplicativo <strong>Câmara na Mão</strong>.</p>";
  body += "<p><strong>Audiência:</strong> " + escapeHtml(comissaoOuTitulo) + (dataHora ? " — " + escapeHtml(dataHora) : "") + "</p>";
  if (record.protocolo != null) {
    body += "<p><strong>Protocolo:</strong> " + String(record.protocolo) + "</p>";
  }
  body +=
    "<p><strong>Inscrito:</strong> " +
    escapeHtml(record.nome) +
    " — " +
    escapeHtml(record.email) +
    " — " +
    escapeHtml(telefoneDigits) +
    "</p>";
  if (tipo === "escrito") {
    body += manifestacaoEscritoAdminHtml(record);
  }
  if (tipo === "videoconferencia" && audiencia?.link_transmissao?.trim()) {
    body +=
      "<p>Link para participação: <a href=\"" +
      escapeHtml(audiencia.link_transmissao) +
      "\">" +
      escapeHtml(audiencia.link_transmissao) +
      "</a></p>";
  }
  if (appUrl) {
    body += '<p><a href="' + escapeHtml(appUrl) + '/audiencias">Abrir audiências no app</a></p>';
  }
  body += "<p style=\"color:#666;font-size:12px;\">Não responda este e-mail. Esta é uma mensagem gerada automaticamente.</p>";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family: sans-serif; line-height: 1.5; color: #333; max-width: 600px;">
  <div style="background: #1e40af; color: #fff; text-align: center; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
    <p style="margin:0; font-weight: bold; font-size: 18px; text-transform: uppercase;">
      Nova ${tipo === "escrito" ? "manifestação" : "inscrição"} em audiência pública
    </p>
  </div>
  <div>${body}</div>
</body>
</html>`;

  return { subject, html };
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let record = payload.record as ParticipacaoRecord;
    // Fonte de verdade no banco (webhook pode omitir colunas ou estar desatualizado)
    if (record.id) {
      const { data: row } = await supabase
        .from("audiencia_participacoes")
        .select(
          "id, audiencia_id, tipo, nome, email, telefone, protocolo, entidade, funcao, bairro, sugestao"
        )
        .eq("id", record.id)
        .maybeSingle();
      if (row) {
        record = { ...record, ...(row as ParticipacaoRecord) };
      }
    }

    const toEmail = typeof record.email === "string" ? record.email.trim() : "";
    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { data: audiencia } = await supabase
      .from("audiencias")
      .select("id, titulo, data, hora, comissao, link_transmissao, ap_code, mais_informacoes")
      .eq("id", record.audiencia_id)
      .maybeSingle();
    const audienciaForEmail = await resolveAudienciaForEmail(supabase, audiencia as AudienciaRow | null);

    const appUrl = (Deno.env.get("APP_URL") || "").replace(/\/$/, "");
    const { subject, html } = buildHtmlEmail(record, audienciaForEmail, appUrl);
    const { subject: adminSubject, html: adminHtml } = buildAdminNotificationEmail(
      record,
      audienciaForEmail,
      appUrl
    );

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

    const adminEmails = ADMIN_NOTIFICATION_EMAILS.filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (sendgridKey && (sendgridFrom || fromAudiencia)) {
      try {
        const resUser = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sendgridKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: toEmail }], subject }],
            from: { email: fromEmail, name: fromName },
            content: [{ type: "text/html", value: html }],
          }),
        });
        if (resUser.ok) emailSent = true;
        else console.warn("[send-audiencia-inscricao-email] SendGrid user email error:", resUser.status, await resUser.text());

        if (adminEmails.length > 0) {
          const resAdmin = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${sendgridKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              personalizations: [{ to: adminEmails.map((email) => ({ email })), subject: adminSubject }],
              from: { email: fromEmail, name: fromName },
              content: [{ type: "text/html", value: adminHtml }],
            }),
          });
          if (!resAdmin.ok) console.warn("[send-audiencia-inscricao-email] SendGrid admin email error:", resAdmin.status, await resAdmin.text());
        }
      } catch (e) {
        console.warn("[send-audiencia-inscricao-email] SendGrid error:", e);
      }
    }

    if (!emailSent && resendKey) {
      try {
        const resUser = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromFinal,
            to: toEmail,
            subject,
            html,
          }),
        });
        if (resUser.ok) emailSent = true;
        else console.warn("[send-audiencia-inscricao-email] Resend user email error:", await resUser.text());

        if (adminEmails.length > 0) {
          const resAdmin = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromFinal,
              to: adminEmails,
              subject: adminSubject,
              html: adminHtml,
            }),
          });
          if (!resAdmin.ok) console.warn("[send-audiencia-inscricao-email] Resend admin email error:", await resAdmin.text());
        }
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
