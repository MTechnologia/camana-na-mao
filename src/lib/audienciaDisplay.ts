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
 * Texto para a seção "Explicação simplificada do que será discutido" no card (descrição limpa e truncada).
 */
export function explicacaoSimplificadaParaCard(descricao: string | null, tema: string, maxLen = 220): string {
  const cleaned = limparDescricaoRepetida(descricao);
  if (cleaned) {
    const oneLine = cleaned.replace(/\s+/g, " ").trim();
    if (oneLine.length <= maxLen) return oneLine;
    return oneLine.slice(0, maxLen) + "…";
  }
  return (tema || "").trim() ? `Audiência pública sobre ${(tema || "").trim()}.` : "Audiência pública. Participe e contribua.";
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

/** Parses convidados into items with nome and cargo on separate lines (nome - cargo). */
export function parseConvidadosItens(texto: string | null | undefined): Array<{ nome: string; cargo: string }> {
  if (!texto || !texto.trim()) return [];
  const norm = normalizarConvidadosParaExibicao(texto);
  return norm
    .split(/\s*;\s*/)
    .map((s) => s.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean)
    .map((seg) => {
      const idx = seg.indexOf(" - ");
      if (idx >= 0) return { nome: seg.slice(0, idx).trim(), cargo: seg.slice(idx + 3).trim() };
      return { nome: seg, cargo: "" };
    });
}

/** Extrai o primeiro e-mail de texto "Mais informações: ..." para usar em mailto:. */
export function extrairEmailDeMaisInformacoes(texto: string | null | undefined): string | null {
  if (!texto || !texto.trim()) return null;
  const match = texto.match(/[\w.+%-]+@[\w.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

const AP_CODE_COMMISSION_HINTS: Record<string, string[]> = {
  ECON: ["economia", "desenvolvimento economico", "turismo", "transito", "transporte", "atividade economica"],
  FIN: ["financas", "orcamento"],
  SAUDE: ["saude", "promocao social", "trabalho", "mulher"],
  TRANS: ["transito", "transporte", "atividade economica", "turismo", "lazer"],
  EDUC: ["educacao", "cultura", "esportes"],
  URB: ["politica urbana", "metropolitana", "meio ambiente"],
  ADM: ["administracao publica"],
  CONST: ["constituicao", "justica", "legislacao"],
  EXTRA: ["extraordinaria"],
};

type AudienciaApCodeContext = {
  ap_code?: string | null;
  comissao?: string | null;
  titulo?: string | null;
  data?: string | null;
};

function normalizeApCodeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function apCodePrefix(apCode?: string | null): string {
  return (apCode ?? "").split("-")[0]?.replace(/\d+$/g, "").toUpperCase() ?? "";
}

function expectedApCodePrefix(audiencia: AudienciaApCodeContext): string | null {
  const text = normalizeApCodeText(`${audiencia.comissao ?? ""} ${audiencia.titulo ?? ""}`);
  if (!text) return null;
  for (const [prefix, hints] of Object.entries(AP_CODE_COMMISSION_HINTS)) {
    if (hints.some((hint) => text.includes(hint))) return prefix;
  }
  return null;
}

function isApCodeConsistent(audiencia: AudienciaApCodeContext): boolean {
  const prefix = apCodePrefix(audiencia.ap_code);
  if (!prefix) return false;
  return expectedApCodePrefix(audiencia) === prefix;
}

function apCodeDateSuffix(data?: string | null): string | null {
  const date = (data ?? "").slice(0, 10);
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

export function formatAudienciaApCode(audiencia: AudienciaApCodeContext | null): string {
  if (!audiencia) return "—";
  const rawApCode = audiencia.ap_code?.trim() ?? "";
  if (rawApCode && isApCodeConsistent(audiencia)) return rawApCode;

  const expectedPrefix = expectedApCodePrefix(audiencia);
  if (!expectedPrefix) return rawApCode || "—";

  const rawSuffix = rawApCode.match(/^[A-Z]+(\d+-\d{2}-\d{2}-\d{4}(?:-\d+h)?)$/i)?.[1];
  if (rawSuffix) return `${expectedPrefix}${rawSuffix}`;

  const dateSuffix = apCodeDateSuffix(audiencia.data);
  return dateSuffix ? `${expectedPrefix}-${dateSuffix}` : expectedPrefix;
}

/** Alinhado ao site da CMSP quando não há inscrição por videoconferência. */
export const OBSERVACAO_SOMENTE_PRESENCIAL_AUDIENCIA =
  "Audiência pública com participação somente presencial. Não é possível se inscrever para participar por videoconferência desta Audiência Pública. Compareça ao evento e contribua presencialmente.";

/** Detecta o texto gerado automaticamente para prazo de inscrição virtual (não vale para audiência somente presencial). */
export function observacaoEhPrazoInscricaoVirtualGerado(texto: string | null | undefined): boolean {
  const t = (texto ?? "").trim().toLowerCase();
  if (!t) return false;
  return (
    /inscri[cç][oõ]es?\s+para\s+participa[cç][aã]o\s+na\s+audi[eê]ncia\s+de\s+forma\s+virtual/i.test(t) &&
    /encerra(m|r[aã]o)?\s+(\u00e0s|as)\s+19h/i.test(t)
  );
}

/**
 * Evita exibir prazo de inscrição virtual quando `permite_inscricao_videoconferencia` é false (dados antigos ou sync pendente).
 */
export function observacaoParaDetalheAudiencia(
  observacao: string | null | undefined,
  permiteInscricaoVideoconferencia: boolean,
): string | null {
  if (permiteInscricaoVideoconferencia) {
    const o = observacao?.trim();
    return o || null;
  }
  if (!observacao?.trim() || observacaoEhPrazoInscricaoVirtualGerado(observacao)) {
    return OBSERVACAO_SOMENTE_PRESENCIAL_AUDIENCIA;
  }
  return observacao.trim();
}
