import { getContentText } from "./lib-index-bootstrap.ts";
import { normalizeReportNature, type UrbanReportNature } from "./lib-urban-rules.ts";

export { normalizeReportNature };

export type ConversationClosingKind =
  | "council_referral_full"
  | "council_referral_partial"
  | "urban_report_created"
  | "transport_report_created"
  | "service_rating_created"
  | "urban_non_complaint_answered"
  | "services_journey_completed"
  | "general_journey_completed"
  | "generic";

export type ConversationClosingOptions = {
  kind: ConversationClosingKind;
  councilName?: string;
  councilParty?: string;
  reportNature?: string | null;
};

/** Bloco exibido no chat com seletor de estrelas (InlineRatingPicker). */
export const CHANNEL_RATING_FIELD = "channel_rating";

export function buildChannelRatingOfferBlock(): string {
  return [
    "**Como foi seu atendimento aqui no Câmara na Mão?**",
    "",
    `[FIELD_REQUEST:${CHANNEL_RATING_FIELD}]Toque nas estrelas abaixo para avaliar de **1 a 5** — sua opinião nos ajuda a melhorar o canal.`,
    "",
    "[RATING_PICKER]",
  ].join("\n");
}

export function buildThanksLine(reportNature: UrbanReportNature | null): string | null {
  switch (reportNature) {
    case "sugestao":
      return "Muito obrigado por compartilhar sua **sugestão** — contribuições como a sua ajudam a pensar melhor a cidade.";
    case "duvida":
      return "Espero ter esclarecido sua **dúvida**. Estamos aqui quando precisar.";
    case "elogio":
      return "Muito obrigado pelo **elogio** — reconhecimentos como o seu motivam o trabalho da Câmara.";
    case "reclamacao":
      return "Obrigado por registrar o relato e ajudar a cuidar da cidade.";
    default:
      return null;
  }
}

function buildAcknowledgmentLine(reportNature: UrbanReportNature | null): string | null {
  switch (reportNature) {
    case "duvida":
      return "Que bom que as informações ajudaram! Fico feliz em ter esclarecido sua dúvida.";
    case "sugestao":
      return "Que bom que a conversa foi útil! Sua sugestão é muito importante para pensarmos a cidade.";
    case "elogio":
      return "Que bom que pude ajudar! Seu reconhecimento faz diferença.";
    default:
      return "Que bom que pude ajudar!";
  }
}

function buildMainClosingLine(options: ConversationClosingOptions): string {
  const { kind, councilName, councilParty } = options;
  if (kind === "urban_non_complaint_answered") {
    return buildAcknowledgmentLine(normalizeReportNature(options.reportNature ?? null)) ?? "";
  }
  if (kind === "services_journey_completed") {
    return "Que bom que consegui ajudar na busca de **serviços perto de você**!";
  }
  if (kind === "general_journey_completed") {
    return "Que bom que as informações sobre a **Câmara Municipal** ajudaram!";
  }
  if (kind === "council_referral_full" && councilName) {
    const party = councilParty ? ` (${councilParty})` : "";
    return `✅ **Encaminhamento registrado!** Sua demanda foi encaminhada para **${councilName}**${party}. O gabinete poderá entrar em contato quando necessário.`;
  }
  if (kind === "council_referral_partial" && councilName) {
    const party = councilParty ? ` (${councilParty})` : "";
    return `✅ **Pedido registrado!** Anotei seu interesse em encaminhar a demanda para **${councilName}**${party}. Se quiser acompanhar com protocolo, você pode **registrar um relato urbano** no app quando desejar.`;
  }
  return "";
}

/** Texto humanizado de encerramento + agradecimento contextual + oferta de avaliação do canal. */
export function buildConversationClosingMessage(options: ConversationClosingOptions): string {
  const nature = normalizeReportNature(options.reportNature ?? null);
  const parts: string[] = [];

  const main = buildMainClosingLine(options);
  if (main) parts.push(main);

  const thanks = (options.kind === "urban_non_complaint_answered" ||
      options.kind === "services_journey_completed" ||
      options.kind === "general_journey_completed")
    ? null
    : buildThanksLine(nature);
  if (thanks) parts.push(thanks);

  if (parts.length > 0) {
    parts.push("---");
  }

  parts.push(buildChannelRatingOfferBlock());
  return parts.join("\n\n");
}

/** Substitui "Posso ajudar com mais alguma coisa?" por encerramento com estrelas. */
export function appendConversationClosingIfNeeded(
  message: string,
  options: ConversationClosingOptions,
): string {
  const trimmed = message.trimEnd();
  if (trimmed.includes("[RATING_PICKER]") || trimmed.includes(`[FIELD_REQUEST:${CHANNEL_RATING_FIELD}]`)) {
    return message;
  }
  if (!/Posso ajudar com mais alguma coisa\?/i.test(trimmed)) {
    return `${trimmed}\n\n${buildConversationClosingMessage(options)}`;
  }
  const withoutLegacyClose = trimmed.replace(/\n*Posso ajudar com mais alguma coisa\?\s*$/i, "").trimEnd();
  return `${withoutLegacyClose}\n\n${buildConversationClosingMessage(options)}`;
}

export function extractReportNatureFromChat(
  chatMessages: Array<Record<string, unknown>>,
): UrbanReportNature | null {
  for (let i = chatMessages.length - 1; i >= 0; i--) {
    const text = getContentText(chatMessages[i].content);
    const progressMatch = text.match(/\[COLLECTION_PROGRESS:urban_report:(\{[\s\S]*?\})\]/);
    if (!progressMatch) continue;
    try {
      const fields = JSON.parse(progressMatch[1]) as { report_nature?: string };
      return normalizeReportNature(fields.report_nature ?? null);
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function assistantOfferedChannelRating(assistantText: string): boolean {
  return /\[FIELD_REQUEST:channel_rating\]/i.test(assistantText) &&
    /\[RATING_PICKER\]/i.test(assistantText);
}

export function parseChannelRatingFromUserMessage(userText: string): number | null {
  const marker = userText.match(/\[RATING_SELECTED:([1-5])\]/i);
  if (marker) {
    const stars = parseInt(marker[1], 10);
    if (stars >= 1 && stars <= 5) return stars;
  }
  const bare = userText.trim().match(/^(\d)$/);
  if (bare) {
    const stars = parseInt(bare[1], 10);
    if (stars >= 1 && stars <= 5) return stars;
  }
  return null;
}

export function userDeclinedChannelRating(userText: string): boolean {
  const t = userText.trim().toLowerCase();
  if (/\[RATING_SELECTED:[1-5]\]/i.test(userText)) return false;
  return /^(n[aã]o|nao|agora n[aã]o|prefiro n[aã]o|n[aã]o quero|pular|obrigad|valeu|só isso|por hora)/i.test(t) ||
    /(é )?só isso|por hora é|muito obrigad|agradeço|agradeco/i.test(t);
}

export function userFarewellWithoutRating(userText: string): boolean {
  if (parseChannelRatingFromUserMessage(userText) != null) return false;
  const t = userText.trim().toLowerCase();
  return /(muito )?obrigad|valeu|só isso|por hora|tenha um (bom|ótimo) dia|até mais|é isso mesmo/i.test(t);
}

/** Agradecimento ou encerramento após resposta informativa (dúvida/sugestão/elogio), sem nova pergunta. */
export function userAcknowledgedUrbanNonComplaintAnswer(userText: string): boolean {
  if (parseChannelRatingFromUserMessage(userText) != null) return false;
  const t = userText.trim().toLowerCase();
  if (t.length < 4) return false;
  if (/\?/.test(t) && !/(obrigad|valeu|maravilh|perfeito|ótimo|otimo|ajudou|esclarec|era isso|só isso)/i.test(t)) {
    return false;
  }
  if (userFarewellWithoutRating(userText) || userDeclinedChannelRating(userText)) return true;
  return /maravilha|perfeito|ótimo|otimo|excelente|ajudou muito|esclareceu|era o que precisava|ótima resposta|otima resposta|muito obrigad|agradeço|agradeco|informações foram úteis|informacoes foram uteis/i
    .test(t);
}

export function stripAssistantMarkersForLengthCheck(assistantText: string): string {
  return assistantText
    .replace(/\[COLLECTION_PROGRESS:[^\]]+\]/g, "")
    .replace(/\[FIELD_REQUEST:[^\]]+\]/g, "")
    .replace(/\[LIGHT_JOURNEY:[^\]]+\]/g, "")
    .replace(/\[SHOW_SERVICES_CHIPS\]/g, "")
    .trim();
}

export function assistantAnsweredUrbanNonComplaintQuestion(
  lastAssistantText: string,
  accumulatedFields: Record<string, unknown>,
  isReadyForLlmTurn: (fields: Record<string, unknown>) => boolean,
): boolean {
  if (!isReadyForLlmTurn(accumulatedFields)) return false;
  if (assistantOfferedChannelRating(lastAssistantText)) return false;
  if (/\[FIELD_REQUEST:/i.test(lastAssistantText)) return false;
  if (/deseja que eu encaminhe sua demanda para algum deles/i.test(lastAssistantText)) return false;
  const body = stripAssistantMarkersForLengthCheck(lastAssistantText);
  return body.length >= 80;
}

export function buildUrbanNonComplaintFarewellMessage(reportNature: string | null): string {
  return buildConversationClosingMessage({
    kind: "urban_non_complaint_answered",
    reportNature,
  });
}

/** Alias semântico: agradecimento após jornada concluída (serviços, dúvida, etc.). */
export const userAcknowledgedJourneyFarewell = userAcknowledgedUrbanNonComplaintAnswer;

export function assistantCompletedServicesJourney(lastAssistantText: string): boolean {
  if (assistantOfferedChannelRating(lastAssistantText)) return false;
  if (/\[FIELD_REQUEST:/i.test(lastAssistantText)) return false;

  const body = stripAssistantMarkersForLengthCheck(lastAssistantText);
  const lower = body.toLowerCase();
  if (
    /como você prefere informar|que tipo de serviço|informe o cep|informe sua localização|qual serviço você procura/i
      .test(lower)
  ) {
    return false;
  }

  if (/maps\.google\.com|google\.com\/maps/i.test(body)) return true;
  if (/posso ajudar em mais alguma coisa/i.test(lower)) return true;
  if (/quer que eu calcule a rota/i.test(lower)) return true;
  if (
    /(mais próxim|mais proxim|dentro de \d+\s*km|até \d+\s*km|ate \d+\s*km)/i.test(lower) &&
    /(escola|ubs|hospital|creche|serviço|servico|📍|•\s*\d+\.)/i.test(body)
  ) {
    return true;
  }

  return false;
}

export function buildServicesJourneyFarewellMessage(): string {
  return buildConversationClosingMessage({ kind: "services_journey_completed" });
}

export function chatIndicatesActiveServicesJourney(
  chatMessages: Array<Record<string, unknown>>,
): boolean {
  const recent = chatMessages.slice(-14);
  return recent.some((message) => {
    const text = getContentText(message.content);
    return /\[LIGHT_JOURNEY:services\]/i.test(text) ||
      /\[COLLECTION_PROGRESS:services:/i.test(text);
  });
}

export function chatIndicatesActiveGeneralJourney(
  chatMessages: Array<Record<string, unknown>>,
): boolean {
  const recent = chatMessages.slice(-14);
  return recent.some((message) => {
    const text = getContentText(message.content);
    return /\[LIGHT_JOURNEY:general\]/i.test(text) ||
      /\[COLLECTION_PROGRESS:general:/i.test(text);
  });
}

export function assistantCompletedGeneralCamaraAnswer(lastAssistantText: string): boolean {
  if (assistantOfferedChannelRating(lastAssistantText)) return false;
  if (/\[FIELD_REQUEST:/i.test(lastAssistantText)) return false;

  const body = stripAssistantMarkersForLengthCheck(lastAssistantText);
  const lower = body.toLowerCase();
  if (body.length < 80) return false;
  if (/qual sua pergunta sobre a câmara|pode perguntar sobre a câmara municipal: funcionamento/i.test(lower)) {
    return false;
  }
  if (/o intuito deste canal é poder te ajudar com estes serviços/i.test(lower)) return false;

  return /processo\s+legislativo|poder\s+legislativo|fiscaliz|vereador|comiss[ãa]o|plen[aá]rio|audi[eê]ncia|legisla[cç][aã]o|orçamento|mesa\s+diretora|pilares|participa[cç][aã]o\s+do\s+cidad[aã]o/i
    .test(lower) || body.length >= 120;
}

export function buildGeneralJourneyFarewellMessage(): string {
  return buildConversationClosingMessage({ kind: "general_journey_completed" });
}

export function isGeneralJourneyFarewellPending(
  collectionIntentType: string | null | undefined,
  lastUserText: string,
  lastAssistantText: string,
  chatMessages: Array<Record<string, unknown>> = [],
): boolean {
  const inGeneralJourney = collectionIntentType === "general" ||
    chatIndicatesActiveGeneralJourney(chatMessages);
  if (!inGeneralJourney) return false;
  if (!userAcknowledgedJourneyFarewell(lastUserText)) return false;
  if (!assistantCompletedGeneralCamaraAnswer(lastAssistantText)) return false;
  return true;
}

export function isServicesJourneyFarewellPending(
  collectionIntentType: string | null | undefined,
  accumulatedFields: Record<string, unknown>,
  lastUserText: string,
  lastAssistantText: string,
  chatMessages: Array<Record<string, unknown>> = [],
): boolean {
  const inServicesJourney = collectionIntentType === "services" ||
    chatIndicatesActiveServicesJourney(chatMessages);
  if (!inServicesJourney) return false;
  if (!userAcknowledgedJourneyFarewell(lastUserText)) return false;
  if (!assistantCompletedServicesJourney(lastAssistantText)) return false;
  // Após find_nearby o progresso pode ser resetado para {}; o histórico do assistente basta.
  void accumulatedFields;
  return true;
}
