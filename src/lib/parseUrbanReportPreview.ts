/**
 * Extrai campos do preview de relato urbano enviado pelo ai-orchestrator
 * (markdown com bullets • **Campo:** valor).
 */

export type ParsedUrbanReportPreview = {
  category: string;
  description: string;
  address: string;
  photosLine?: string;
  /** Texto de instrução após os dados (sem markdown de negrito). */
  footerHint: string;
};

export function parseUrbanReportPreview(text: string): ParsedUrbanReportPreview | null {
  if (!text || !/\*\*Resumo do relato\*\*/i.test(text)) return null;

  const hintSplit = text.split(/\n(?=Se estiver tudo certo)/i);
  const mainPart = hintSplit[0] ?? text;
  const hintPart = hintSplit[1] ?? "";
  const footerHint = hintPart
    .replace(/\[QUICK_REPLY:[^\]]+\]/g, "")
    .replace(/\*\*/g, "")
    .trim();

  const catM = mainPart.match(/•\s*\*\*Categoria:\*\*\s*(.+)/i);
  const descM = mainPart.match(/•\s*\*\*Descrição:\*\*\s*(.+)/i);
  const addrM = mainPart.match(/•\s*\*\*Endereço:\*\*\s*(.+)/i);
  const photosM = mainPart.match(/•\s*\*\*Fotos anexadas:\*\*\s*(.+)/i);

  if (!catM?.[1]?.trim()) return null;

  return {
    category: catM[1].trim(),
    description: descM?.[1]?.trim() || "—",
    address: addrM?.[1]?.trim() || "—",
    photosLine: photosM?.[1]?.trim(),
    footerHint:
      footerHint ||
      "Se estiver tudo certo, clique em Confirmar para registrar ou em Corrigir para alterar algo.",
  };
}

export function isUrbanConfirmCorrectQuickReply(messageContent: string): boolean {
  const m = messageContent.match(/\[QUICK_REPLY:([^\]]+)\]/);
  if (!m) return false;
  const parts = m[1].split(",").map((v) => v.trim().toLowerCase());
  return parts.includes("confirmar") && parts.includes("corrigir");
}
