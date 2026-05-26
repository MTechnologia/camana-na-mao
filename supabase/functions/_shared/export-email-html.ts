export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface ExportEmailContentInput {
  scheduleName: string;
  datasetLabel: string;
  rowCount: number;
  format: string;
  signedDownloadUrl: string;
  exportsPageUrl: string;
}

export function buildExportCompletedEmailHtml(input: ExportEmailContentInput): string {
  const { scheduleName, datasetLabel, rowCount, format, signedDownloadUrl, exportsPageUrl } =
    input;
  return `
      <p>Olá,</p>
      <p>Sua exportação agendada <strong>${escapeHtml(scheduleName)}</strong> (${escapeHtml(datasetLabel)}, ${rowCount.toLocaleString("pt-BR")} linhas, formato ${escapeHtml(format.toUpperCase())}) foi concluída.</p>
      <p><a href="${escapeHtml(signedDownloadUrl)}" style="display:inline-block;padding:12px 24px;background:#c00000;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Baixar arquivo agora</a></p>
      <p>O link de download direto é válido por 7 dias. Você também pode acessar o painel:</p>
      <p><a href="${escapeHtml(exportsPageUrl)}">${escapeHtml(exportsPageUrl)}</a></p>
      <p style="color:#666;font-size:12px;">Câmara na Mão — exportação automática</p>
    `;
}

export function buildExportCompletedEmailSubject(scheduleName: string): string {
  return `Exportação "${scheduleName}" pronta para download`;
}
