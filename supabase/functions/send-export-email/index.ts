/**
 * HU-8.1 — E-mail de exportação concluída com link de download (signed URL, 7 dias).
 * Chamado por process-export-job (agendamentos). Auth: X-Cron-Secret ou service role.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildExportCompletedEmailHtml,
  buildExportCompletedEmailSubject,
} from "../_shared/export-email-html.ts";
import { readAppOriginFromFilters, resolveAppUrl } from "../_shared/resolve-app-url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const STORAGE_BUCKET = "export-files";
const SIGNED_URL_TTL = 60 * 60 * 24 * 7;

function isAuthorized(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret")?.trim();
    if (header === cronSecret) return true;
  }
  const auth = req.headers.get("authorization") ?? "";
  const apikey = req.headers.get("apikey") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (serviceKey && (auth.includes(serviceKey) || apikey === serviceKey)) return true;
  if (anonKey && (auth.includes(anonKey) || apikey === anonKey)) return true;
  return false;
}

async function sendViaSendGrid(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get("SENDGRID_API_KEY");
  const from = Deno.env.get("SENDGRID_FROM");
  if (!key || !from) return false;
  const fromMatch = from.match(/^(.+?)\s*<([^>]+)>$/);
  const fromEmail = fromMatch ? fromMatch[2].trim() : from;
  const fromName = fromMatch ? fromMatch[1].trim() : "Câmara na Mão";
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }], subject }],
      from: { email: fromEmail, name: fromName },
      content: [{ type: "text/html", value: html }],
    }),
  });
  if (!res.ok) {
    console.warn("[send-export-email] SendGrid:", res.status, await res.text());
  }
  return res.ok;
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM");
  if (!key || !from) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    console.warn("[send-export-email] Resend:", await res.text());
  }
  return res.ok;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { jobId, appOrigin } = (await req.json()) as { jobId?: string; appOrigin?: string };
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: job, error: jobErr } = await supabase
      .from("export_jobs")
      .select(
        "id, user_id, dataset, format, row_count, storage_path, status, scheduled_export_id, filters",
      )
      .eq("id", jobId)
      .single();

    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: "Job não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (job.status !== "completed" || !job.storage_path) {
      return new Response(JSON.stringify({ error: "Exportação ainda não concluída" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(job.storage_path, SIGNED_URL_TTL);

    if (signErr || !signed?.signedUrl) {
      throw signErr ?? new Error("Falha ao gerar signed URL");
    }

    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(job.user_id);
    if (userErr) throw userErr;
    const toEmail = userData.user?.email?.trim();
    if (!toEmail) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let scheduleName = "agendada";
    let scheduleFilters: Record<string, unknown> | null = null;
    if (job.scheduled_export_id) {
      const { data: sch } = await supabase
        .from("scheduled_exports")
        .select("name, filters")
        .eq("id", job.scheduled_export_id)
        .maybeSingle();
      if (sch?.name) scheduleName = sch.name;
      if (sch?.filters && typeof sch.filters === "object") {
        scheduleFilters = sch.filters as Record<string, unknown>;
      }
    }

    const jobFilters = (job.filters ?? {}) as Record<string, unknown>;
    const mergedFilters = { ...scheduleFilters, ...jobFilters };
    const appUrl = resolveAppUrl({
      explicitOrigin: appOrigin,
      filters: mergedFilters,
      scheduleName,
    });
    const exportsPage = `${appUrl}/admin/exports?jobId=${job.id}`;

    const datasetLabel =
      job.dataset === "urban_reports"
        ? "relatos urbanos"
        : job.dataset === "transport_reports"
          ? "relatos de transporte"
          : job.dataset;
    const rowCount = job.row_count ?? 0;

    const subject = buildExportCompletedEmailSubject(scheduleName);
    const html = buildExportCompletedEmailHtml({
      scheduleName,
      datasetLabel,
      rowCount,
      format: job.format,
      signedDownloadUrl: signed.signedUrl,
      exportsPageUrl: exportsPage,
    });

    let sent = await sendViaSendGrid(toEmail, subject, html);
    if (!sent) sent = await sendViaResend(toEmail, subject, html);

    if (!sent) {
      console.warn("[send-export-email] Nenhum provedor de e-mail configurado ou envio falhou");
      return new Response(JSON.stringify({ skipped: true, reason: "email_provider" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[send-export-email] enviado", { jobId, appUrl, toEmail });

    return new Response(JSON.stringify({ ok: true, email: toEmail, appUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-export-email]", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
