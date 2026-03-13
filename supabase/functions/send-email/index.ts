/**
 * Send Email Hook do Supabase Auth: envia e-mails de autenticação (recuperação de senha,
 * confirmação de cadastro, etc.) via SendGrid em vez do SMTP padrão.
 *
 * Configuração: Supabase Dashboard → Authentication → Hooks → Send Email Hook →
 * URL desta function e secret SEND_EMAIL_HOOK_SECRET.
 *
 * Secrets: SEND_EMAIL_HOOK_SECRET (gerado no Dashboard em Auth Hooks);
 *          SENDGRID_API_KEY, SENDGRID_FROM (já usados em outras functions).
 *
 * Deploy: supabase functions deploy send-email --no-verify-jwt
 */

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

interface HookUser {
  id: string;
  email?: string;
  user_metadata?: { email?: string };
}

interface HookEmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  token_new?: string;
  token_hash_new?: string;
  old_email?: string;
}

function buildConfirmationUrl(supabaseUrl: string, emailData: HookEmailData): string {
  const base = (supabaseUrl || "").replace(/\/$/, "");
  const params = new URLSearchParams({
    token: emailData.token_hash,
    type: emailData.email_action_type,
    redirect_to: emailData.redirect_to || "",
  });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getSubjectAndBody(
  emailActionType: string,
  confirmationUrl: string,
  token: string
): { subject: string; html: string } {
  const linkHtml = `<a href="${escapeHtml(confirmationUrl)}" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Redefinir senha</a>`;
  switch (emailActionType) {
    case "recovery":
      return {
        subject: "Câmara na Mão – Redefinição de senha",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redefinição de senha</title></head>
<body style="font-family:sans-serif;line-height:1.5;color:#333;max-width:600px;">
  <div style="background:#22c55e;color:#fff;text-align:center;padding:12px 16px;border-radius:8px;margin-bottom:16px;">
    <p style="margin:0;font-weight:bold;font-size:18px;">Redefinição de senha</p>
  </div>
  <p>Você solicitou a redefinição de senha. Clique no botão abaixo para definir uma nova senha:</p>
  <p>${linkHtml}</p>
  <p>Ou copie e cole este link no navegador:</p>
  <p style="word-break:break-all;font-size:12px;color:#666;">${escapeHtml(confirmationUrl)}</p>
  <p>Se você não solicitou isso, ignore este e-mail.</p>
  <p style="color:#666;font-size:12px;">Não responda este e-mail. Mensagem automática – Câmara na Mão.</p>
</body>
</html>`,
      };
    case "signup":
      return {
        subject: "Câmara na Mão – Confirme seu e-mail",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Confirme seu e-mail</title></head>
<body style="font-family:sans-serif;line-height:1.5;color:#333;max-width:600px;">
  <div style="background:#22c55e;color:#fff;text-align:center;padding:12px 16px;border-radius:8px;margin-bottom:16px;">
    <p style="margin:0;font-weight:bold;font-size:18px;">Confirme seu cadastro</p>
  </div>
  <p>Clique no link abaixo para confirmar seu e-mail:</p>
  <p><a href="${escapeHtml(confirmationUrl)}" style="color:#2563eb;">Confirmar e-mail</a></p>
  <p>Ou use o código: <strong>${escapeHtml(token)}</strong></p>
  <p style="color:#666;font-size:12px;">Não responda este e-mail. Mensagem automática – Câmara na Mão.</p>
</body>
</html>`,
      };
    case "magiclink":
      return {
        subject: "Câmara na Mão – Link de acesso",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Link de acesso</title></head>
<body style="font-family:sans-serif;line-height:1.5;color:#333;max-width:600px;">
  <p>Clique para acessar: <a href="${escapeHtml(confirmationUrl)}">Entrar</a></p>
  <p>Código: <strong>${escapeHtml(token)}</strong></p>
  <p style="color:#666;font-size:12px;">Não responda este e-mail. Mensagem automática – Câmara na Mão.</p>
</body>
</html>`,
      };
    default:
      return {
        subject: "Câmara na Mão – Confirmação",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;line-height:1.5;color:#333;">
  <p>Clique para confirmar: <a href="${escapeHtml(confirmationUrl)}">Confirmar</a></p>
  <p>Código: <strong>${escapeHtml(token)}</strong></p>
</body>
</html>`,
      };
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const hookSecretRaw = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (!hookSecretRaw) {
    console.error("[send-email] SEND_EMAIL_HOOK_SECRET not set");
    return new Response(JSON.stringify({ error: "Hook not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers.entries());
  const base64Secret = hookSecretRaw.replace(/^v1,whsec_/, "");
  const wh = new Webhook(base64Secret);

  let user: HookUser;
  let emailData: HookEmailData;
  try {
    const parsed = wh.verify(payload, headers) as { user: HookUser; email_data: HookEmailData };
    user = parsed.user;
    emailData = parsed.email_data;
  } catch (err) {
    console.error("[send-email] Webhook verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const toEmail = user?.email || user?.user_metadata?.email;
  if (!toEmail || typeof toEmail !== "string") {
    return new Response(JSON.stringify({ error: "No recipient email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const confirmationUrl = buildConfirmationUrl(supabaseUrl || "", emailData);
  const { subject, html } = getSubjectAndBody(
    emailData.email_action_type,
    confirmationUrl,
    emailData.token || ""
  );

  const sendgridKey = Deno.env.get("SENDGRID_API_KEY");
  const sendgridFrom = Deno.env.get("SENDGRID_FROM");
  if (!sendgridKey || !sendgridFrom) {
    console.error("[send-email] SENDGRID_API_KEY or SENDGRID_FROM not set");
    return new Response(JSON.stringify({ error: "SendGrid not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fromMatch = sendgridFrom.trim().match(/^(.+?)\s*<([^>]+)>$/);
  const fromName = fromMatch ? fromMatch[1].trim() : "Câmara na Mão";
  const fromEmail = fromMatch ? fromMatch[2].trim() : sendgridFrom.trim();

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
    if (!res.ok) {
      const text = await res.text();
      console.error("[send-email] SendGrid error:", res.status, text);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: text }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("[send-email] SendGrid request failed:", e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
