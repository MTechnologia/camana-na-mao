/**
 * Comparação de busca tolerante a acentos (NFD) e a múltiplas palavras (todas devem aparecer).
 */
export function normalizeSearchText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function textMatchesSearchQuery(haystack: string, queryRaw: string): boolean {
  const q = normalizeSearchText(queryRaw).trim();
  if (!q) return true;
  const h = normalizeSearchText(haystack);
  const words = q.split(/\s+/).filter((w) => w.length > 0);
  return words.every((w) => h.includes(w));
}
