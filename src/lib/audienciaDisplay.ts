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

/** Prefixo comum da descrição (SPLEGIS); removido para a descrição começar pelo tema. */
const PREFIXO_OBJETIVO_TEMA = /^Esta\s+audiência\s+tem\s+o\s+objetivo\s+de\s+debater\s+o\s+seguinte\s+tema\s*:\s*/i;

/** Remove todo trecho "Convidados: ..." da descrição (até "Local:", "Observação:", "Mais informações:" ou fim). Evita duplicação com a coluna convidados. */
export function removerSecaoConvidadosDaDescricao(desc: string): string {
  const re = /\s*Convidados\s*:[\s\S]+?(?=\s*Convidados\s*:|\s*Local\s*:|\s*Observa[cç][aã]o\s*:|\s*Mais\s+informa[cç][oõ]es\s*:|$)/gi;
  let d = desc;
  let prev = "";
  while (prev !== d) {
    prev = d;
    d = d.replace(re, " ").trim();
  }
  return d.replace(/\s+/g, " ").trim();
}

/** Remove prefixos repetitivos, "Esta audiência tem o objetivo... tema: " e a seção Convidados (exibida separadamente pela coluna convidados). */
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
  d = d.replace(PREFIXO_OBJETIVO_TEMA, "").trim();
  d = removerSecaoConvidadosDaDescricao(d);
  return d.trim();
}

/** Extrai o texto após "tema:" na descrição, para usar como título curto. */
function extrairTemaDaDescricao(desc: string): string | null {
  const m = desc.match(/(?:debater\s+o\s+seguinte\s+tema\s*:\s*|tema\s*:\s*)(.+?)(?:\.|$)/is);
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

/**
 * Título para o card: prefere "Audiência: {comissao}" quando a comissão existe (padrão do site oficial).
 */
export function tituloCardAudiencia(
  comissao: string | null,
  titulo: string,
  descricao: string | null,
  tema: string
): string {
  const c = (comissao || "").trim();
  if (c) return `Audiência: ${c}`;
  return tituloParaExibicao(titulo, descricao, tema);
}

/**
 * Descrição formatada para a página de detalhes: padrão do site oficial.
 * - Remove prefixos redundantes e a seção "Convidados:" (exibida separadamente pela coluna convidados).
 * - Quebra após "tema: " para o tema ficar na linha seguinte.
 * - Garante quebra antes de "Local:", "Observação:", "Mais informações:".
 * Retorna string com \n para exibir com whitespace-pre-line.
 */
export function descricaoParaDetalhe(desc: string | null): string {
  if (!desc || !desc.trim()) return "";
  let d = desc.trim();
  for (const re of PREFIXOS_DESCRICAO) {
    d = d.replace(re, "").trim();
  }
  d = removerSecaoConvidadosDaDescricao(d);
  // Padrão site oficial: "Esta audiência tem o objetivo de debater o seguinte tema: X."
  // → quebra de linha após "tema: " para X ficar sozinho na linha seguinte
  d = d.replace(/\b(tema\s*:\s*)(.+?)(\.)(\s|$)/gis, (_, prefixo, tema, ponto, esp) => `${prefixo}\n${tema}${ponto}${esp || ""}`);
  // Quebras antes de seções (Local, Observação, Mais informações)
  d = d.replace(/\s+(Local\s*:)/gi, "\n\n$1");
  d = d.replace(/\s+(Observa[cç][aã]o\s*:)/gi, "\n\n$1");
  d = d.replace(/\s+(Mais\s+informa[cç][oõ]es\s*:)/gi, "\n\n$1");
  return d.trim();
}

/** Normaliza o texto da coluna convidados para exibição: em dash (—) e hífens duplicados → um só "- ". */
export function normalizarConvidadosParaExibicao(texto: string | null | undefined): string {
  if (!texto || !texto.trim()) return "";
  return texto
    .trim()
    .replace(/\u2014/g, "-")   // em dash —
    .replace(/\u2013/g, "-")   // en dash –
    .replace(/\s*-\s*-\s*/g, " - ")
    .replace(/\n\s*-\s*-\s*/g, "\n- ")
    .replace(/^-\s*-\s*/, "- ")
    .replace(/\n\s*-\s+/g, "\n- ")
    .trim();
}
