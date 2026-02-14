/**
 * Helpers para exibição de audiências: título inteligente e descrição sem repetição.
 * Remove "Audiência pública sobre" e variações da descrição; deriva título do tema/descrição quando o título é genérico.
 */

/** Título é genérico se for só "Audiência pública" (com variações) ou vazio. */
const TITULO_GENERICO_REGEX = /^Audiência\s+pública\s*$/i;

export function isTituloGenerico(titulo: string): boolean {
  const t = (titulo || "").trim();
  if (!t) return true;
  return TITULO_GENERICO_REGEX.test(t);
}

const PREFIXOS_DESCRICAO = [
  /^Audiência\s+pública\s+sobre\s+/i,
  /^Audiência\s+pública\s+para\s+/i,
  /^Audiência\s+pública\s+/i,
];

/** Remove prefixos repetitivos (ex.: "Audiência pública sobre Audiência pública sobre...") em loop. */
export function limparDescricaoRepetida(desc: string | null): string {
  if (!desc || !desc.trim()) return "";
  let d = desc.trim();
  let prev = "";
  while (prev !== d) {
    prev = d;
    for (const re of PREFIXOS_DESCRICAO) {
      d = d.replace(re, "").trim();
    }
  }
  return d;
}

/** Extrai o texto após "tema:" (ou "tema :") na primeira frase, para usar como título curto. */
function extrairTemaDaDescricao(desc: string): string | null {
  const m = desc.match(/(?:debater\s+o\s+seguinte\s+tema\s*:\s*|tema\s*:\s*)(.+?)(?:\.|$)/i);
  const tema = m?.[1]?.trim();
  if (tema && tema.length >= 5 && tema.length <= 120) return tema;
  return null;
}

export function tituloParaExibicao(
  titulo: string,
  descricao: string | null,
  tema: string
): string {
  const tituloTrim = (titulo || "").trim();
  if (tituloTrim && !isTituloGenerico(titulo)) return tituloTrim;

  const desc = limparDescricaoRepetida(descricao);
  if (desc) {
    const temaExtraido = extrairTemaDaDescricao(desc);
    if (temaExtraido) return temaExtraido;
    const primeiraFrase = desc.split(/[.!?]/)[0]?.trim();
    if (primeiraFrase && primeiraFrase.length > 10) {
      return primeiraFrase.length > 120 ? primeiraFrase.slice(0, 117) + "..." : primeiraFrase;
    }
    if (desc.length > 10) return desc.length > 120 ? desc.slice(0, 117) + "..." : desc;
  }

  if ((tema || "").trim() && (tema || "").trim().toLowerCase() !== "geral") {
    return `Audiência sobre ${(tema || "").trim()}`;
  }
  return tituloTrim || "Audiência pública";
}
