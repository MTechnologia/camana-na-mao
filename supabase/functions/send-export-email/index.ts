// HU-8.2 — Envio automático do arquivo gerado por email.
//
// Recebe { jobId }. Valida que o job está completed e tem storage_path. Resolve
// o email do dono (auth.users.email), gera uma signed URL do Storage com 7
// dias de validade, monta o HTML em PT-BR (assunto + corpo com botão "Baixar
// arquivo") e envia via SendGrid (primário) com fallback Resend.
//
// Auth: aceita JWT do gateway Supabase OU X-Cron-Secret (CRON_SHARED_SECRET).
// Normalmente é chamado pela edge function `process-export-job` imediatamente
// após concluir um job com source='scheduled'.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const STORAGE_BUCKET = "export-files";
const SIGNED_URL_EXPIRES_SECONDS = 60 * 60 * 24 * 7; // 7 dias

interface JobRow {
  id: string;
  user_id: string;
  dataset: string;
  format: "csv" | "xlsx";
  status: string;
  row_count: number | null;
  storage_path: string | null;
  source: string;
  scheduled_export_id: string | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function datasetLabel(id: string): string {
  if (id === "urban_reports") return "Relatos urbanos";
  if (id === "transport_reports") return "Relatos de transporte";
  return id;
}

export function buildExportEmailHtml(params: {
  recipientName: string;
  scheduleName: string;
  dataset: string;
  format: string;
  rowCount: number | null;
  signedUrl: string;
  appUrl: string;
  expiresInDays: number;
  brasaoUrl?: string;
}): { subject: string; html: string } {
  const {
    recipientName,
    scheduleName,
    dataset,
    format,
    rowCount,
    signedUrl,
    appUrl,
    expiresInDays,
    brasaoUrl,
  } = params;

  const subject = `[Câmara na Mão] Exportação "${scheduleName}" pronta`;
  const formatLabel = format === "csv" ? "CSV (.csv)" : "Excel (.xlsx)";
  const rowsLine =
    rowCount !== null && rowCount !== undefined
      ? `<p style="margin:8px 0 0 0;font-size:13px;color:#666">
           <strong>${rowCount.toLocaleString("pt-BR")}</strong> linhas exportadas.
         </p>`
      : "";

  const html = `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8" /><title>${escapeHtml(subject)}</title></head>
  <body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#222">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f6f6f6;padding:24px 0">
      <tr><td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
          <tr><td style="padding:24px 24px 16px 24px;text-align:center;border-bottom:1px solid #f0f0f0">
            ${brasaoUrl ? `<img src="${escapeHtml(brasaoUrl)}" alt="Brasão de São Paulo" width="44" style="display:inline-block" />` : ""}
            <h1 style="margin:8px 0 0 0;font-size:18px;font-weight:600;color:#111">Câmara na Mão</h1>
            <p style="margin:4px 0 0 0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.05em">Exportação agendada</p>
          </td></tr>

          <tr><td style="padding:24px">
            <p style="margin:0 0 12px 0;font-size:15px">Olá, <strong>${escapeHtml(recipientName)}</strong> 👋</p>
            <p style="margin:0 0 16px 0;font-size:14px;line-height:1.5">
              Sua exportação agendada <strong>"${escapeHtml(scheduleName)}"</strong> foi gerada com sucesso.
            </p>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px;margin:16px 0">
              <p style="margin:0;font-size:13px;color:#374151">
                <strong>${escapeHtml(datasetLabel(dataset))}</strong> · ${escapeHtml(formatLabel)}
              </p>
              ${rowsLine}
            </div>

            <div style="margin:24px 0;text-align:center">
              <a href="${escapeHtml(signedUrl)}"
                 style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600">
                ⬇ Baixar arquivo
              </a>
              <p style="margin:8px 0 0 0;font-size:11px;color:#9ca3af">
                Link válido por ${expiresInDays} dias.
              </p>
            </div>

            <p style="margin:24px 0 0 0;font-size:12px;color:#666;line-height:1.5">
              Você também pode acompanhar e gerenciar todos os seus agendamentos em
              <a href="${escapeHtml(appUrl)}/admin/configuracoes/agendamentos" style="color:#dc2626">
                Câmara na Mão → Agendamentos
              </a>.
            </p>
          </td></tr>

          <tr><td style="padding:12px 24px;background:#f9fafb;border-top:1px solid #f0f0f0;text-align:center">
            <p style="margin:0;font-size:11px;color:#888">
              Este email foi enviado automaticamente porque você configurou esta exportação como agendamento.
              Para desativar, abra o agendamento e desmarque "Enviar por email".
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, html };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: shared secret OU jwt do gateway. Quando deployado --no-verify-jwt,
    // o secret é obrigatório.
    const cronSecret = Deno.env.get("CRON_SHARED_SECRET");
    const verifyJwt = Deno.env.get("VERIFY_JWT") !== "false";
    if (!verifyJwt) {
      const provided = req.headers.get("x-cron-secret");
      if (!cronSecret || provided !== cronSecret) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Config ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const jobId: string | undefined = body?.jobId;
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1) Carrega o job e valida pré-condições.
    const { data: jobData, error: jobErr } = await supabase
      .from("export_jobs")
      .select(
        "id, user_id, dataset, format, status, row_count, storage_path, source, scheduled_export_id",
      )
      .eq("id", jobId)
      .single();
    if (jobErr || !jobData) {
      return new Response(JSON.stringify({ error: "Job não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const job = jobData as JobRow;

    if (job.status !== "completed" || !job.storage_path) {
      return new Response(
        JSON.stringify({ ok: false, skipped: true, reason: "job_not_completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Carrega o scheduled_export pra pegar o nome e validar notify_email.
    let scheduleName = "Exportação agendada";
    let notifyEmail = true;
    if (job.scheduled_export_id) {
      const { data: sch } = await supabase
        .from("scheduled_exports")
        .select("name, notify_email")
        .eq("id", job.scheduled_export_id)
        .single();
      if (sch) {
        scheduleName = (sch as { name: string }).name ?? scheduleName;
        notifyEmail =
          (sch as { notify_email?: boolean }).notify_email ?? notifyEmail;
      }
    }

    if (!notifyEmail) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "notify_email_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) Resolve email do dono via auth admin API.
    const { data: ownerData, error: ownerErr } = await supabase.auth.admin.getUserById(
      job.user_id,
    );
    if (ownerErr || !ownerData?.user?.email) {
      return new Response(
        JSON.stringify({ error: "Email do dono não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const toEmail = ownerData.user.email;
    const recipientName =
      (ownerData.user.user_metadata?.full_name as string | undefined)?.trim() ||
      (ownerData.user.user_metadata?.name as string | undefined)?.trim() ||
      toEmail.split("@")[0];

    // 4) Gera signed URL do Storage.
    const { data: signed, error: signErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(job.storage_path, SIGNED_URL_EXPIRES_SECONDS);
    if (signErr || !signed?.signedUrl) {
      return new Response(
        JSON.stringify({ error: "Falha ao gerar signed URL", details: signErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5) Monta o email.
    const appUrl = (Deno.env.get("APP_URL") || "").replace(/\/$/, "") ||
      "https://camana-na-mao-767943602990.southamerica-east1.run.app";
    const brasaoUrl =
      Deno.env.get("BRASAO_URL") ||
      "https://camana-na-mao-767943602990.southamerica-east1.run.app/assets/brasao-sp-DF635zJ4.png";

    const { subject, html } = buildExportEmailHtml({
      recipientName,
      scheduleName,
      dataset: job.dataset,
      format: job.format,
      rowCount: job.row_count,
      signedUrl: signed.signedUrl,
      appUrl,
      expiresInDays: 7,
      brasaoUrl,
    });

    // 6) Envia via SendGrid (primário) com fallback Resend.
    const sendgridKey = Deno.env.get("SENDGRID_API_KEY");
    const sendgridFrom = Deno.env.get("SENDGRID_FROM");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = Deno.env.get("RESEND_FROM");

    const fromFinal = sendgridFrom?.trim() || resendFrom?.trim();
    if (!fromFinal) {
      console.warn("[send-export-email] No FROM configured");
      return new Response(
        JSON.stringify({ ok: false, skipped: true, reason: "no_from_configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fromMatch = fromFinal.match(/^(.+?)\s*<([^>]+)>$/);
    const fromName = fromMatch ? fromMatch[1].trim() : "Câmara na Mão";
    const fromEmail = fromMatch ? fromMatch[2].trim() : fromFinal;

    let sent = false;
    let lastError: string | null = null;

    if (sendgridKey && sendgridFrom) {
      try {
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
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
        if (res.ok) sent = true;
        else lastError = `SendGrid ${res.status}: ${await res.text()}`;
      } catch (e) {
        lastError = `SendGrid throw: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    if (!sent && resendKey && resendFrom) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [toEmail],
            subject,
            html,
          }),
        });
        if (res.ok) sent = true;
        else lastError = `Resend ${res.status}: ${await res.text()}`;
      } catch (e) {
        lastError = `Resend throw: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    if (!sent) {
      console.error("[send-export-email] falha ao enviar email:", lastError);
      return new Response(
        JSON.stringify({ ok: false, error: lastError ?? "Sem provedor configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, sent: true, to: toEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[send-export-email] erro:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
