/**
 * Detecção/matching/formatação para perguntas de CONTATO de vereador (telefone,
 * e-mail, gabinete, sala, andar). Respondidas SEMPRE com o dado real da lista
 * oficial (fetch-vereadores / CMSP) — ou com o canal oficial quando faltar —,
 * nunca deixando a LLM inventar telefone/e-mail/gabinete. Funções puras (sem
 * rede) para serem testáveis; a busca da lista fica em lib-citizen-support.
 */

export type VereadorRecord = {
  name: string;
  party: string;
  phone?: string;
  email?: string;
  sala?: string;
  andar?: string;
  areasDeAtuacao?: string[];
  isSubstitute?: boolean;
  isOnLeave?: boolean;
};

export type VereadorContactQuery = { name: string }; // name === "" → contato sem nome específico

// Intenção de CONTATO (telefone/e-mail/gabinete/sala/andar/ramal/como falar).
const CONTACT_INTENT =
  /\btelefone\b|\bfone\b|\bramal\b|\be-?mail\b|\bgabinete\b|\bcontato\b|entrar\s+em\s+contato|como\s+(?:falo|fala|encontro|acho)\s+com|n[uú]mero\s+(?:do|da|de)\b/i;

// Fluxos que NÃO são contato (feedback/encaminhamento/avaliação) — não interceptar.
const FEEDBACK_OR_FORWARD = /feedback|elogi|reclam|sugest|sugerir|denunci|encaminh|avali/i;

function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim();
}

/** Extrai o nome que vem depois de "vereador(a)" (ex.: "do vereador João Silva"). */
function extractVereadorName(text: string): string {
  const m = text.match(/vereador(?:a)?\s+(.+)$/i);
  if (!m) return "";
  let name = m[1];
  // corta em pontuação ou em palavras de contato que venham depois do nome
  name = name.split(/[?.!,;:]/)[0];
  name = name.replace(
    /\b(telefone|fone|ramal|e-?mail|gabinete|contato|sala|andar|n[uú]mero|por favor)\b.*$/i,
    "",
  );
  name = name.replace(/^(o|a|do|da|de|dr|dra|sr|sra)\s+/i, "").trim();
  // precisa parecer nome (≥3 chars, ao menos uma letra)
  return /[\p{L}]{3,}/u.test(name) ? name.trim() : "";
}

/**
 * Detecta pergunta sobre o CONTATO de um vereador. Retorna { name } com o nome
 * citado (ou "" quando é contato sem nome específico). null quando não é pergunta
 * de contato de vereador (ou é fluxo de feedback/encaminhamento).
 */
export function detectVereadorContactQuery(message: string): VereadorContactQuery | null {
  const text = (message ?? "").trim();
  if (!text || text.length > 160) return null;
  if (!/\bvereador(?:a|es)?\b/i.test(text)) return null;
  if (FEEDBACK_OR_FORWARD.test(text)) return null;
  if (!CONTACT_INTENT.test(text)) return null;
  return { name: extractVereadorName(text) };
}

/** Casa o nome citado contra a lista oficial (igual → contém → primeiro+último nome). */
export function matchVereador(name: string, list: VereadorRecord[]): VereadorRecord | null {
  const q = normalize(name);
  if (!q || list.length === 0) return null;

  const exact = list.find((v) => normalize(v.name) === q);
  if (exact) return exact;

  const contains = list.filter((v) => normalize(v.name).includes(q));
  if (contains.length === 1) return contains[0];

  const parts = q.split(" ").filter((p) => p.length >= 3);
  if (parts.length >= 2) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    const byEnds = list.filter((v) => {
      const n = normalize(v.name);
      return n.includes(first) && n.includes(last);
    });
    if (byEnds.length === 1) return byEnds[0];
  }
  // 1 token único que casa exatamente um vereador
  if (parts.length === 1) {
    const single = list.filter((v) => normalize(v.name).split(" ").includes(parts[0]));
    if (single.length === 1) return single[0];
  }
  return contains.length === 1 ? contains[0] : null;
}

/** Resposta com os dados de contato REAIS disponíveis; campos ausentes não são inventados. */
export function formatVereadorContactReply(v: VereadorRecord): string {
  const lines = [`**${v.name}**${v.party ? ` (${v.party})` : ""}`];
  if (v.phone) lines.push(`📞 Telefone: ${v.phone}`);
  if (v.email) lines.push(`✉️ E-mail: ${v.email}`);
  const local = [v.sala ? `sala ${v.sala}` : "", v.andar ? `${v.andar}º andar` : ""].filter(Boolean).join(", ");
  if (local) lines.push(`🏛️ Gabinete: ${local}`);

  const faltando: string[] = [];
  if (!v.phone) faltando.push("telefone");
  if (!v.email) faltando.push("e-mail");
  if (!local) faltando.push("gabinete");

  let body = lines.join("\n");
  body += "\n\n_Dados da lista oficial da Câmara Municipal de São Paulo._";
  if (faltando.length) {
    body += ` Não tenho ${faltando.join(", ")} desse vereador por aqui — consulte a lista oficial em ` +
      `[/institucional/vereadores](/institucional/vereadores) ou ligue 156.`;
  }
  return `${body}\n\nPosso ajudar em mais alguma coisa?`;
}

/** Pergunta de contato sem um nome específico → aponta o canal oficial (sem inventar). */
export function vereadorContactNoNameReply(): string {
  return (
    "Os contatos dos vereadores (telefone do gabinete, e-mail e sala) estão na lista oficial da " +
    "Câmara: [/institucional/vereadores](/institucional/vereadores). Me diga o nome do vereador que " +
    "eu localizo para você. Posso ajudar em mais alguma coisa?"
  );
}

/** Nome citado, mas sem correspondência na lista oficial → honesto, sem inventar. */
export function vereadorNotFoundReply(name: string): string {
  const ref = name?.trim() ? ` com o nome "${name.trim()}"` : "";
  return (
    `Não encontrei um vereador${ref} na lista oficial da Câmara. Confira a grafia ou veja a lista ` +
    "completa em [/institucional/vereadores](/institucional/vereadores). Posso ajudar em mais alguma coisa?"
  );
}
