/** Ordenação por relevância dos equipamentos do InlineServicePicker (pura/testável). */

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Ordena os equipamentos pela relevância ao texto digitado: nome igual → começa
 * com → contém → demais. NÃO filtra (mantém todas as linhas) — só reordena para o
 * match mais óbvio aparecer no topo da lista.
 */
export function rankServiceMatches<T extends { name: string }>(rows: T[], query: string): T[] {
  const q = norm(query);
  if (!q) return rows;
  const score = (name: string): number => {
    const n = norm(name);
    if (n === q) return 0;
    if (n.startsWith(q)) return 1;
    if (n.includes(q)) return 2;
    return 3;
  };
  return [...rows].sort((a, b) => score(a.name) - score(b.name));
}
