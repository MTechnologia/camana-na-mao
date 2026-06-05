import { inferServiceTypeFromText } from "./lib-service-discovery.ts";

/**
 * Detecção/extração de perguntas sobre LOCALIZAÇÃO de serviço público nomeado
 * (ex.: "Onde fica a UBS Vila Maria?", "E a UBS Continental?"). Usado para
 * responder SEMPRE com o dado real do `public_services` (ou um "não encontrei"
 * honesto) — nunca deixar a LLM inventar nome/endereço/telefone.
 */

const SERVICE_QUERY_STOPWORDS = new Set([
  "onde", "fica", "ficam", "localizacao", "localiza", "localizada", "localizado", "endereco",
  "perto", "proximo", "proxima", "proximos", "proximas", "mais", "como", "chego", "chegar",
  "qual", "quais", "gostaria", "quero", "saber", "favor", "por", "me", "dizer", "tem", "ha", "existe",
  "uma", "um", "a", "o", "os", "as", "de", "da", "do", "das", "dos", "na", "no", "nas", "nos", "em", "pra", "para",
  "mim", "aqui", "regiao", "minha", "meu", "sua", "voce", "vc", "e",
  // palavras de "contato/horário" também são ruído na busca pelo NOME do serviço
  "telefone", "fone", "ramal", "contato", "email", "e-mail", "horario", "horarios",
  "funcionamento", "funciona", "aberto", "abre", "atende", "atendimento", "que", "horas",
  // referências temporais comuns em perguntas de horário
  "hoje", "amanha", "agora", "sabado", "sabados", "domingo", "domingos",
  "feriado", "feriados", "fim", "semana", "aos",
]);

/**
 * Extrai o termo de busca de um pedido de localização ("Onde fica a usb vila
 * maria" → "ubs vila maria"): corrige o typo usb→ubs e remove palavras de
 * pergunta/localização, para casar com getServiceAddressByName (full-text).
 */
export function extractServiceSearchTerm(description: string): string {
  const normalized = (description || "")
    .toLowerCase()
    .replace(/\busb\b/g, "ubs")
    .replace(/[?!.,;:]/g, " ");
  const kept = normalized
    .split(/\s+/)
    .filter(Boolean)
    .filter((tok) => !SERVICE_QUERY_STOPWORDS.has(tok.normalize("NFD").replace(/\p{M}/gu, "")));
  const term = kept.join(" ").trim();
  return term.length >= 3 ? term : (description || "").trim();
}

// Contextos em que a menção a um serviço NÃO é um pedido de localização (é
// relato, avaliação, ocupação, agendamento ou encaminhamento) — não interceptar.
const NON_LOCATION_CONTEXT =
  /\bavali|\bnota\b|estrela|reclam|denunci|\bproblema\b|buraco|entulho|\brelato\b|registrar|ocupa[cç]|lota[cç]|\bchei[oa]\b|movimenta|agendar|marcar\s+consulta|vereador|encaminh|como\s+che(?:go|gar)/i;

// "Mais perto de mim", "próximo daqui" etc. são buscas por PROXIMIDADE (sem nome
// específico) — vão pelo fluxo de proximidade (pede CEP/bairro), não por aqui.
const PROXIMITY_CONTEXT = /\bperto\b|pr[oó]xim|de\s+mim|minha\s+regi[aã]o/i;

// Sinais de que a pergunta é sobre ONDE FICA / contato / horário de um serviço
// nomeado (inclui o follow-up "E a UBS X?" e "qual o telefone/horário da UBS X?").
// NÃO inclui "perto/próximo" (proximidade) nem "como chegar" (rota).
const LOCATION_OR_IDENTITY_INTENT =
  /\bonde\b|\bfica\b|\bficam\b|endere[cç]o|localiza|\btelefone\b|\bfone\b|\bcontato\b|\bramal\b|e-?mail|hor[áa]rio|funciona|\baberto\b|\babre\b|\batende\b|^\s*e\s+[ao]?\b/i;

// Pergunta sobre HORÁRIO/funcionamento — o public_services não tem esse dado,
// então respondemos com honestidade (sem inventar) em vez do endereço.
const HOURS_INTENT = /hor[áa]rio|funciona(?:mento)?|\baberto\b|\babre\b|que\s+horas|at[ée]\s+que\s+horas/i;

export type NamedServiceLocationQuery = { serviceType: string; term: string; wantsHours: boolean };

/**
 * Detecta pergunta sobre a localização de um serviço público NOMEADO. Só dispara
 * quando há um TIPO de serviço (UBS, hospital, escola…) + um NOME (termo com ≥2
 * tokens) e a intenção é de localização/identidade — nunca em contexto de
 * relato/avaliação/ocupação. Retorna null para "qual a UBS mais perto" (sem
 * nome → vai pelo fluxo de proximidade) e para mensagens longas (provável relato).
 */
export function detectNamedServiceLocationQuery(message: string): NamedServiceLocationQuery | null {
  const text = (message ?? "").trim();
  if (!text || text.length > 140) return null;
  if (NON_LOCATION_CONTEXT.test(text)) return null;
  if (PROXIMITY_CONTEXT.test(text)) return null;
  if (!LOCATION_OR_IDENTITY_INTENT.test(text)) return null;
  const serviceType = inferServiceTypeFromText(text);
  if (!serviceType) return null;
  const term = extractServiceSearchTerm(text);
  const tokens = term.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null; // precisa de um NOME além do tipo do serviço
  return { serviceType, term, wantsHours: HOURS_INTENT.test(text) };
}

const SERVICE_ACRONYMS = new Set([
  "ubs", "ceu", "cras", "cred", "ama", "caps", "upa", "cei", "emei", "emef", "ceu's",
]);

/** "ubs continental" → "UBS Continental" (acrônimos em maiúsculas). */
export function prettyServiceName(term: string): string {
  return term
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (SERVICE_ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
