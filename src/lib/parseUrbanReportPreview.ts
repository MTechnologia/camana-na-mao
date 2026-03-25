/**
 * Extrai campos do preview de relato urbano enviado pelo ai-orchestrator
 * (markdown com bullets • **Campo:** valor).
 */

export type ParsedUrbanReportPreview = {
  /** Natureza: reclamação, dúvida, sugestão, elogio (quando presente no resumo). */
  nature?: string;
  category: string;
  /** Subcategoria / rótulo técnico (quando presente). */
  tipoDetalhe?: string;
  description: string;
  /** Criticidade coletada (rótulo em português, ex.: Crítico, Moderado). */
  gravity?: string;
  /** Lista textual de tipos de risco (quando presente). */
  riskTypesLine?: string;
  /** Escopo de afetação (quando presente). */
  affectedScope?: string;
  cep?: string;
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

  const natureM = mainPart.match(/•\s*\*\*Natureza:\*\*\s*(.+)/i);
  const catM = mainPart.match(/•\s*\*\*Categoria:\*\*\s*(.+)/i);
  const tipoM = mainPart.match(/•\s*\*\*Tipo \/ detalhe:\*\*\s*(.+)/i);
  const descM = mainPart.match(/•\s*\*\*Descrição:\*\*\s*(.+)/i);
  const gravM = mainPart.match(/•\s*\*\*Gravidade:\*\*\s*(.+)/i);
  const riskTypesM = mainPart.match(/•\s*\*\*Tipos de risco:\*\*\s*(.+)/i);
  const affM = mainPart.match(/•\s*\*\*Afeta[cç][aã]o:\*\*\s*(.+)/i);
  const cepM = mainPart.match(/•\s*\*\*CEP:\*\*\s*(.+)/i);
  const addrM = mainPart.match(/•\s*\*\*Endereço:\*\*\s*(.+)/i);
  const photosM = mainPart.match(/•\s*\*\*Fotos anexadas:\*\*\s*(.+)/i);

  if (!catM?.[1]?.trim()) return null;

  return {
    nature: natureM?.[1]?.trim(),
    category: catM[1].trim(),
    tipoDetalhe: tipoM?.[1]?.trim(),
    description: descM?.[1]?.trim() || "—",
    gravity: gravM?.[1]?.trim(),
    riskTypesLine: riskTypesM?.[1]?.trim(),
    affectedScope: affM?.[1]?.trim(),
    cep: cepM?.[1]?.trim(),
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
