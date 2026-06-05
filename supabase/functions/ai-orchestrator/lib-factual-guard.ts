/**
 * Verificador pós-resposta (Fase 4 anti-alucinação) — última linha de defesa
 * para o caminho de resposta LIVRE da LLM (quando nenhuma ferramenta/contexto
 * ancorou o turno). Se a resposta livre contém um dado factual de ALTO RISCO
 * (telefone com DDD, celular, e-mail, CEP ou endereço com número) que a LLM não
 * poderia ter de fonte confiável, substituímos por uma resposta honesta — em vez
 * de arriscar entregar um dado inventado.
 *
 * Conservador, para NÃO degradar respostas legítimas:
 * - Se houve contexto/RAG injetado no turno (groundingInjected), NÃO mexe — a
 *   LLM pode estar citando um dado real do contexto.
 * - Se a resposta tem marcadores de fluxo (FIELD_REQUEST, pickers, COLLECTION_
 *   PROGRESS, etc.), NÃO mexe — é um passo guiado, não uma resposta factual livre.
 * - Telefone só dispara na forma com DDD "(11) 0000-0000" ou celular "00000-0000"
 *   (5+4) — evita falso-positivo com intervalos de ano tipo "2020-2024".
 */

// "(11) 3742-8350" (DDD) ou celular "91234-5678" (5-4). Anos "2020-2024" (4-4 sem
// DDD) NÃO casam de propósito.
const PHONE = /\(\d{2}\)\s*\d{4,5}-\d{4}|\b\d{5}-\d{4}\b/;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const CEP = /\b\d{5}-\d{3}\b/;
const ADDRESS_WITH_NUMBER =
  /\b(rua|r\.|av\.?|avenida|alameda|al\.|travessa|tv\.|pra[çc]a|estrada|rod\.?|rodovia|viaduto|largo)\s+[^\n,]{2,50},?\s*(?:n[º°.]?\s*)?\d{1,5}\b/i;

const FLOW_MARKER =
  /\[(FIELD_REQUEST|COLLECTION_PROGRESS|VEREADOR_PICKER|SERVICE_PICKER|LOCATION_METHOD_PICKER|ADDRESS_PICKER|RATING_PICKER|QUICK_REPLY|SHOW_SERVICES_CHIPS|APP_ACTIONS|LIGHT_JOURNEY|REPORT_CREATED|TRANSPORT_CREATED|RATING_CREATED)/;

export const UNGROUNDED_FACTUAL_REPLY =
  "Sobre dados específicos como **endereço, telefone, e-mail, CEP ou datas**, não tenho essa informação " +
  "confirmada por aqui e prefiro não arriscar um dado incorreto. Você pode confirmar pela central **156** " +
  "ou no site **cmsp.sp.gov.br**. Posso ajudar em mais alguma coisa?";

/** Há, no texto, um dado factual de alto risco (telefone/e-mail/CEP/endereço)? */
export function answerHasHighRiskFactualData(text: string): boolean {
  return PHONE.test(text) || EMAIL.test(text) || CEP.test(text) || ADDRESS_WITH_NUMBER.test(text);
}

/**
 * Decide se a resposta livre da LLM deve ser substituída por uma resposta honesta.
 * Retorna o texto (original ou sanitizado) e se houve redação.
 */
export function sanitizeUngroundedFactualAnswer(
  text: string,
  opts: { groundingInjected: boolean },
): { text: string; redacted: boolean } {
  if (!text || text.trim() === "") return { text, redacted: false };
  if (opts.groundingInjected) return { text, redacted: false };
  if (FLOW_MARKER.test(text)) return { text, redacted: false };
  if (!answerHasHighRiskFactualData(text)) return { text, redacted: false };
  return { text: UNGROUNDED_FACTUAL_REPLY, redacted: true };
}
