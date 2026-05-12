/**
 * HU-8.2 — Template HTML do email "Exportação pronta".
 *
 * Função pura, sem dependências externas, exportada também para a edge
 * function `send-export-email` (Deno) e testada em Vitest no client.
 *
 * Mantém em sincronia com a versão Deno (espelhada em
 * supabase/functions/send-export-email/index.ts) — se mudar aqui,
 * espelhe lá também.
 */

export interface ExportEmailInput {
  recipientName: string;
  scheduleName: string;
  dataset: string;
  format: "csv" | "xlsx";
  rowCount: number | null;
  signedUrl: string;
  appUrl: string;
  expiresInDays: number;
  brasaoUrl?: string;
}

export interface ExportEmailOutput {
  subject: string;
  html: string;
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

export function buildExportEmail(input: ExportEmailInput): ExportEmailOutput {
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
  } = input;

  const subject = `[Câmara na Mão] Exportação "${scheduleName}" pronta`;
  const formatLabel = format === "csv" ? "CSV (.csv)" : "Excel (.xlsx)";
  const rowsLine =
    rowCount !== null && rowCount !== undefined
      ? `<p style="margin:8px 0 0 0;font-size:13px;color:#666"><strong>${rowCount.toLocaleString("pt-BR")}</strong> linhas exportadas.</p>`
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
              <p style="margin:0;font-size:13px;color:#374151"><strong>${escapeHtml(datasetLabel(dataset))}</strong> · ${escapeHtml(formatLabel)}</p>
              ${rowsLine}
            </div>
            <div style="margin:24px 0;text-align:center">
              <a href="${escapeHtml(signedUrl)}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600">⬇ Baixar arquivo</a>
              <p style="margin:8px 0 0 0;font-size:11px;color:#9ca3af">Link válido por ${expiresInDays} dias.</p>
            </div>
            <p style="margin:24px 0 0 0;font-size:12px;color:#666;line-height:1.5">
              Você também pode acompanhar e gerenciar todos os seus agendamentos em
              <a href="${escapeHtml(appUrl)}/admin/configuracoes/agendamentos" style="color:#dc2626">Câmara na Mão → Agendamentos</a>.
            </p>
          </td></tr>
          <tr><td style="padding:12px 24px;background:#f9fafb;border-top:1px solid #f0f0f0;text-align:center">
            <p style="margin:0;font-size:11px;color:#888">Este email foi enviado automaticamente porque você configurou esta exportação como agendamento. Para desativar, abra o agendamento e desmarque "Enviar por email".</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, html };
}
