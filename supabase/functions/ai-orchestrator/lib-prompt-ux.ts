const MARKER_PATTERN = /\[[A-Z_]+(?::[^\]]*)?\]/g;

// Abreviações comuns (logradouros/títulos) cujo "." NÃO é fim de frase. Sem isto,
// um endereço como "Av. Eng. Heitor ..." era cortado em "Av. Eng." pelo divisor.
const ABBREVIATION_DOT =
  /\b(av|r|pç|pc|dr|dra|sr|sra|eng|prof|profa|jd|pq|al|alm|trav|tv|rod|km|ap|apto|bl|no|nº)\.(?=\s)/gi;
const DOT_PLACEHOLDER = String.fromCharCode(1);

function compactPlainText(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return clean;
  // Mascara os pontos de abreviação para o divisor de sentenças não cortar endereços.
  const masked = clean.replace(ABBREVIATION_DOT, (_m, abbr) => `${abbr}${DOT_PLACEHOLDER}`);
  const unmask = (s: string) => s.split(DOT_PLACEHOLDER).join(".");
  const sentences = masked.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length >= 2) {
    return unmask(`${sentences[0]} ${sentences[1]}`).trim();
  }
  const single = unmask(sentences[0] ?? masked);
  if (single.length > 180) {
    return `${single.slice(0, 177).trimEnd()}...`;
  }
  return single;
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
