/**
 * Decodifica entidades HTML comuns vindas do cadastro (GeoSampa) para exibição
 * ao cidadão. Ex.: "CEU Butantã &#8211; Professora…" → "CEU Butantã – Professora…".
 * Cobre entidades numéricas (&#8211;), hexadecimais (&#x2013;) e as nomeadas mais
 * frequentes. Pura/testável.
 */
export function decodeHtmlEntities(input: string | null | undefined): string {
  if (!input) return "";
  return String(input)
    .replace(/&#(\d+);/g, (_m, dec) => safeFromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&"); // por último, p/ não re-decodificar entidades "&amp;#8211;"
}

function safeFromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}
