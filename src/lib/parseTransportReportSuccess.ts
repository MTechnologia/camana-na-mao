import { sanitizeMessageContent } from "@/lib/sanitizeMarkers";

export type ParsedTransportReportSuccess = {
  reportId: string;
  lines: string[];
};

const CLOSING_MARKERS = /\[FIELD_REQUEST:channel_rating\]|\[RATING_PICKER\]/i;

function stripInlineMarkdown(line: string): string {
  return line
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\]\([^)]*\)/g, "")
    .replace(/\(\/transporte\/meus-relatos\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Quebra mensagem antiga em bloco único em linhas por emoji de campo. */
function splitDenseTransportSuccessBody(text: string): string[] {
  const parts = text.split(
    /(?=🔖\s|📋\s|🚌\s|📅\s|🕐\s|🧭\s|🔁\s|🎯\s|🚏\s|📌\s|📷\s|⚠️\s|📝\s|📚\s|🔗\s|✅\s)/u,
  );
  return parts.map(stripInlineMarkdown).filter(Boolean);
}

/**
 * Extrai o bloco legível do pós-registro de transporte (sem marcadores técnicos nem pickers).
 */
export function parseTransportReportSuccess(content: string): ParsedTransportReportSuccess | null {
  const idMatch = content.match(/\[TRANSPORT_CREATED:([0-9a-f-]+)\]/i);
  if (!idMatch) return null;

  let text = sanitizeMessageContent(content);
  const closingIdx = text.search(CLOSING_MARKERS);
  if (closingIdx >= 0) {
    text = text.slice(0, closingIdx);
  }

  text = text.trim();

  let lines = text
    .split("\n")
    .map(stripInlineMarkdown)
    .filter(Boolean);

  if (lines.length <= 1 && /(?:🔖|📋|🚌|📅|🕐|🧭|🔁|🚏|📌|📷|⚠️|📝|📚|🔗)/u.test(lines[0] ?? text)) {
    lines = splitDenseTransportSuccessBody(lines[0] ?? text);
  }

  const normalized = lines.map((line) => {
    if (line.startsWith("✅ ")) return line.slice(2).trim();
    if (/^Relato de transporte registrado!/i.test(line)) {
      return "Relato de transporte registrado!";
    }
    return line;
  });

  return { reportId: idMatch[1], lines: normalized };
}
