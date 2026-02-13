/**
 * Helpers para exibição de audiências: título inteligente e descrição sem repetição.
 */

function normalizarTitulo(t: string): string {
  return (t || "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function isTituloGenerico(titulo: string): boolean {
  const t = (titulo || "").trim();
  if (t.length < 30) return true;
  return normalizarTitulo(t) === "audiência pública";
}

export function limparDescricaoRepetida(desc: string | null): string {
  if (!desc || !desc.trim()) return "";
  let d = desc.trim();
  // Remove prefixos repetitivos (case-insensitive, espaços flexíveis)
  const prefixos = [
    /^Audiência\s+pública\s+sobre\s+/i,
    /^Audiência\s+pública\s+para\s+/i,
    /^Audiência\s+pública\s+/i,
  ];
  for (const re of prefixos) {
    d = d.replace(re, "").trim();
  }
  return d;
}

export function tituloParaExibicao(
  titulo: string,
  descricao: string | null,
  tema: string
): string {
  if (!isTituloGenerico(titulo) && titulo.trim()) return titulo.trim();
  const desc = limparDescricaoRepetida(descricao);
  if (desc) {
    const primeiraFrase = desc.split(/[.!?]/)[0]?.trim();
    if (primeiraFrase && primeiraFrase.length > 10) {
      return primeiraFrase.length > 120 ? primeiraFrase.slice(0, 117) + "..." : primeiraFrase;
    }
    return desc.length > 120 ? desc.slice(0, 117) + "..." : desc;
  }
  return titulo.trim() || `Audiência pública sobre ${tema}`;
}
