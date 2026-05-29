const MARKER_PATTERN = /\[[A-Z_]+(?::[^\]]*)?\]/g;

function compactPlainText(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return clean;
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length >= 2) {
    return `${sentences[0]} ${sentences[1]}`.trim();
  }
  if (clean.length > 180) {
    return `${clean.slice(0, 177).trimEnd()}...`;
  }
  return clean;
}

/** CHB-028: perguntas curtas com chips para risco e escopo (acessível a idosos). */
export const URBAN_RISK_LEVEL_FIELD_PROMPT =
  "[FIELD_REQUEST:risk_level]Há risco imediato no local? Toque uma opção ou descreva em uma frase.[QUICK_REPLY:critical,moderate,low,none]";

export const URBAN_AFFECTED_SCOPE_FIELD_PROMPT =
  "[FIELD_REQUEST:affected_scope]Quem mais está sendo afetado? Toque uma opção.[QUICK_REPLY:somente eu,toda a rua,bairro todo]";

export function compactFieldPrompt(prompt: string): string {
  if (!prompt) return prompt;
  const markers = prompt.match(MARKER_PATTERN) ?? [];
  const fieldMarker = markers.find((m) => m.startsWith("[FIELD_REQUEST:")) ?? "";
  const auxMarkers = markers.filter((m) => m !== fieldMarker);

  const body = prompt.replace(MARKER_PATTERN, " ");
  const compactBody = compactPlainText(body);

  const prefix = fieldMarker || "";
  const suffix = auxMarkers.join("");
  return `${prefix}${compactBody}${suffix}`.trim();
}
