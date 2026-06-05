/**
 * Limpa o endereço/nome de equipamento vindo do cadastro (GeoSampa) antes de
 * exibir ao cidadão: decodifica entidades HTML (ex.: "&#8211;" → "–"), normaliza
 * espaços e remove travessões/hífens soltos no início/fim. Pura/testável.
 */
const HTML_ENTITIES: Record<string, string> = {
  "&#8211;": "–",
  "&#8212;": "—",
  "&#8217;": "'",
  "&#8220;": '"',
  "&#8221;": '"',
  "&amp;": "&",
  "&apos;": "'",
  "&#39;": "'",
  "&quot;": '"',
  "&nbsp;": " ",
};

export function cleanServiceAddress(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = String(raw);
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    s = s.split(entity).join(char);
  }
  return s
    .replace(/\s+/g, " ")
    .replace(/^[\s,\-–—]+/, "")
    .replace(/[\s,\-–—]+$/, "")
    .trim();
}
