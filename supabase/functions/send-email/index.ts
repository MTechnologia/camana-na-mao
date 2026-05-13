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

const DEFAULT_BRASAO_URL =
  "https://camana-na-mao-767943602990.southamerica-east1.run.app/assets/brasao-sp-DF635zJ4.png";

interface HookUser {
  id: string;
  email?: string;
  user_metadata?: {
    email?: string;
    full_name?: string;
    name?: string;
  };
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

function getUserName(user: HookUser): string {
  return (
    user.user_metadata?.full_name?.trim() ||
    user.user_metadata?.name?.trim() ||
    "usuário"
  );
}

function buildActionButton(label: string, url: string, color = "#c00000"): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:30px auto;">
      <tr>
        <td align="center" bgcolor="${color}" style="border-radius:8px;box-shadow:0 3px 8px rgba(0,0,0,.22);">
          <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:15px 42px;color:#ffffff;text-decoration:none;font-weight:700;font-size:18px;letter-spacing:.4px;text-transform:uppercase;border-radius:8px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

function buildBaseEmail(params: {
  title: string;
  preheader: string;
  body: string;
  footerNote?: string;
}): string {
  const brasaoUrl = Deno.env.get("EMAIL_BRASAO_URL")?.trim() || DEFAULT_BRASAO_URL;
  const footerNote = params.footerNote
    ? `<p style="margin:18px 0 0;color:#666666;font-size:13px;font-style:italic;text-align:center;">${params.footerNote}</p>`
    : "";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#555555;line-height:1.55;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(params.preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:28px 16px 18px;">
        <img src="${escapeHtml(brasaoUrl)}" alt="Brasão de São Paulo" width="58" style="display:block;width:58px;max-width:58px;height:auto;margin:0 auto 12px;border:0;outline:none;text-decoration:none;">
        <div style="font-size:13px;font-weight:700;letter-spacing:.5px;color:#111111;text-transform:uppercase;">Câmara Municipal de</div>
        <div style="font-size:26px;font-weight:800;letter-spacing:.5px;color:#111111;text-transform:uppercase;line-height:1;">São Paulo</div>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 16px 36px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;">
          <tr>
            <td style="padding:0 0 18px;font-size:18px;color:#555555;">
              ${params.body}
              ${footerNote}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:#d1d1d1;padding:24px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" align="center" style="max-width:760px;">
          <tr>
            <td align="center" style="padding:0 0 12px;">
              <img src="${escapeHtml(brasaoUrl)}" alt="Brasão de São Paulo" width="50" style="display:block;width:50px;max-width:50px;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;">
            </td>
          </tr>
          <tr>
            <td align="center" style="font-size:15px;font-weight:700;color:#ffffff;line-height:1.5;">
              Câmara Municipal de São Paulo | Viaduto Jacareí, 100 - Bela Vista, São Paulo - SP, 01319-900
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:14px;font-size:12px;color:#f7f7f7;">
              Não responda este e-mail. Mensagem automática enviada pelo aplicativo Câmara na Mão.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getSubjectAndBody(
  emailActionType: string,
  confirmationUrl: string,
  token: string,
  user: HookUser
): { subject: string; html: string } {
  const name = escapeHtml(getUserName(user));

  switch (emailActionType) {
    case "recovery":
      return {
        subject: "Câmara na Mão | Redefinição de senha",
        html: buildBaseEmail({
          title: "Redefinição de senha",
          preheader: "Configure uma nova senha para acessar o Câmara na Mão.",
          body: `
            <p style="margin:0 0 18px;">Olá ${name},</p>
            <p style="margin:0 0 18px;">Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Câmara na Mão</strong>.</p>
            <p style="margin:0 0 6px;">Clique no botão abaixo para configurar sua nova senha:</p>
            ${buildActionButton("Redefinir senha", confirmationUrl)}
            <p style="margin:0 0 8px;font-size:14px;color:#666666;">Se o botão não funcionar, copie e cole este link no navegador:</p>
            <p style="margin:0 0 20px;word-break:break-all;font-size:12px;color:#666666;">
              <a href="${escapeHtml(confirmationUrl)}" style="color:#9b0000;">${escapeHtml(confirmationUrl)}</a>
            </p>`,
          footerNote:
            "Se você não solicitou essa alteração, por favor, ignore este e-mail. Sua senha atual permanecerá segura.",
        }),
      };
    case "signup":
      return {
        subject: "Câmara na Mão | Confirme seu cadastro",
        html: buildBaseEmail({
          title: "Confirme seu cadastro",
          preheader: "Confirme seu e-mail para ativar sua conta no Câmara na Mão.",
          body: `
            <p style="margin:0 0 18px;">Olá ${name},</p>
            <p style="margin:0 0 18px;">Recebemos seu cadastro no <strong>Câmara na Mão</strong>, o app da Câmara Municipal de São Paulo.</p>
            <p style="margin:0 0 6px;">Clique no botão abaixo para confirmar seu e-mail e ativar sua conta:</p>
            ${buildActionButton("Confirmar cadastro", confirmationUrl)}
            <p style="margin:0 0 8px;font-size:14px;color:#666666;">Se preferir, use este código de confirmação:</p>
            <p style="margin:0 0 20px;font-size:20px;color:#111111;font-weight:700;letter-spacing:1px;">${escapeHtml(token)}</p>
            <p style="margin:0;font-size:14px;color:#666666;">Se o botão não funcionar, copie e cole este link no navegador:</p>
            <p style="margin:6px 0 0;word-break:break-all;font-size:12px;color:#666666;">
              <a href="${escapeHtml(confirmationUrl)}" style="color:#9b0000;">${escapeHtml(confirmationUrl)}</a>
            </p>`,
          footerNote:
            "Se você não criou esta conta, por favor, ignore este e-mail.",
        }),
      };
    case "magiclink":
      return {
        subject: "Câmara na Mão | Link de acesso",
        html: buildBaseEmail({
          title: "Link de acesso",
          preheader: "Use este link para acessar o Câmara na Mão.",
          body: `
            <p style="margin:0 0 18px;">Olá ${name},</p>
            <p style="margin:0 0 6px;">Clique no botão abaixo para acessar o <strong>Câmara na Mão</strong>:</p>
            ${buildActionButton("Entrar no app", confirmationUrl)}
            <p style="margin:0;font-size:14px;color:#666666;">Código: <strong>${escapeHtml(token)}</strong></p>`,
          footerNote:
            "Se você não solicitou este acesso, por favor, ignore este e-mail.",
        }),
      };
    default:
      return {
        subject: "Câmara na Mão | Confirmação",
        html: buildBaseEmail({
          title: "Confirmação",
          preheader: "Confirme sua solicitação no Câmara na Mão.",
          body: `
            <p style="margin:0 0 18px;">Olá ${name},</p>
            <p style="margin:0 0 6px;">Clique no botão abaixo para confirmar sua solicitação:</p>
            ${buildActionButton("Confirmar", confirmationUrl)}
            <p style="margin:0;font-size:14px;color:#666666;">Código: <strong>${escapeHtml(token)}</strong></p>`,
        }),
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
    emailData.token || "",
    user
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

  const mailPayload = {
    personalizations: [{ to: [{ email: toEmail }], subject }],
    from: { email: fromEmail, name: fromName },
    content: [{ type: "text/html", value: html }],
  };

  const postSendGrid = async () =>
    fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mailPayload),
    });

  try {
    let res = await postSendGrid();
    // Transientes (rate limit / instabilidade) e falhas 5xx: uma nova tentativa após breve espera
    if (!res.ok && [429, 500, 502, 503, 504].includes(res.status)) {
      await new Promise((r) => setTimeout(r, 800));
      res = await postSendGrid();
    }
    if (!res.ok) {
      const text = await res.text();
      console.error("[send-email] SendGrid error:", res.status, text);
      // 403: remetente/domínio não verificado no SendGrid é o caso mais comum em produção
      if (res.status === 403) {
        console.error(
          "[send-email] Dica: valide o remetente (Single Sender) ou autentique o domínio em SendGrid; confira SENDGRID_FROM.",
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: text.slice(0, 2000) }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (e) {
    console.error("[send-email] SendGrid request failed:", e);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const res2 = await postSendGrid();
      if (res2.ok) {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const t2 = await res2.text();
      console.error("[send-email] SendGrid retry failed:", res2.status, t2);
    } catch (e2) {
      console.error("[send-email] SendGrid retry exception:", e2);
    }
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
