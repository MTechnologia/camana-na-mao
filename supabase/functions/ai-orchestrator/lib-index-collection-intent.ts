import type { CollectionIntent } from "./lib.ts";
import { getContentText } from "./lib-index-bootstrap.ts";
import { createSseResponse } from "./lib-index-sse.ts";

type ChatHistoryEntry = {
  role: string;
  content: string;
};

type ResolveCollectionIntentArgs = {
  chatHistoryTyped: ChatHistoryEntry[];
  chatMessages: Array<Record<string, unknown>>;
  corsHeaders: Record<string, string>;
  frontendCollectionType: string;
  lastAssistantText: string;
  lastUserMsg: string;
  lib: typeof import("./lib.ts");
};

type ResolveCollectionIntentResult = {
  collectionIntent: CollectionIntent | null;
  journeyDeclined: boolean;
  journeySwitched: boolean;
  response?: Response;
};

const STRUCTURED_TYPES = ["urban_report", "transport_report", "service_rating"] as const;
const STRUCTURED_TYPES_SET = new Set<string>(STRUCTURED_TYPES);

export const LIGHT_JOURNEY_TYPES = [
  "services",
  "occupancy",
  "audiencias",
  "history",
  "general",
  "vereadores",
  "noticias",
] as const;

const JOURNEY_NAMES: Record<string, string> = {
  urban_report: "Relato Urbano",
  transport_report: "Diagnóstico de Transporte",
  service_rating: "Avaliação de Serviço",
  services: "Busca de Serviços",
  audiencias: "Audiências Públicas",
  history: "Meu Histórico",
  general: "Dúvidas Gerais",
  vereadores: "Vereadores da Região",
  noticias: "Notícias Legislativas",
  chamber_feedback: "Feedback sobre Vereador",
};

const EXPLICIT_SWITCH_KEYWORDS = [
  "quero relatar",
  "preciso relatar",
  "relatar um problema",
  "problema urbano",
  "relatar problema",
  "problema no transporte",
  "problema de transporte",
  "relatar transporte",
  "problema no ônibus",
  "problema no metrô",
  "quero avaliar",
  "preciso avaliar",
  "avaliar um serviço",
  "quero fazer uma avaliação",
  "quero fazer avaliação",
  "fazer uma avaliação",
  "quero dar nota",
  "dar minha avaliação",
  "avaliar o serviço",
  "avaliar atendimento",
  "avaliar uma ubs",
  "avaliar uma escola",
  "avaliar este serviço",
  "avaliar essa",
  "quero avaliar essa",
];

function getDeclinedJourneys(messages: Array<Record<string, unknown>>): Set<string> {
  const declined = new Set<string>();
  for (const message of messages) {
    if (message.role !== "user") continue;
    const declineMatch = getContentText(message.content).match(/\[JOURNEY_DECLINED:(\w+)\]/);
    if (declineMatch) {
      declined.add(declineMatch[1]);
    }
  }
  return declined;
}

function buildJourneySwitchPrompt(
  currentType: string,
  newType: string,
  currentName: string,
  newName: string,
  progressNote = "",
  intro = "Parece que você quer iniciar um",
  suffix = "Deseja:\n\n",
): string {
  return `[JOURNEY_SWITCH_PROMPT:${newType}:${currentType}]` +
    `${intro} **${newName}**.\n\n` +
    `Você estava em **${currentName}**${progressNote}. ${suffix}`;
}

function isAddressConfirmationMessage(message: string): boolean {
  return /endere[cç]o\s*selecionado\s*:/i.test(message) ||
    (/CEP\s*:\s*\d{5}-?\d{3}/i.test(message) && /(avenida|rua|r\.|al\.|pra[cç]a)/i.test(message));
}

function shouldPreserveUrbanContext(
  args: {
    chatHistoryTyped: ChatHistoryEntry[];
    frontendCollectionType?: string;
    lastAssistantText: string;
    lastUserMsg: string;
    lib: typeof import("./lib.ts");
  },
): boolean {
  const { chatHistoryTyped, frontendCollectionType, lastAssistantText, lastUserMsg, lib } = args;
  const isAddressConfirmation = isAddressConfirmationMessage(lastUserMsg);
  if (!isAddressConfirmation) return false;
  if (frontendCollectionType && frontendCollectionType !== "services") return false;

  const urbanAccumulated = lib.accumulateFieldsFromHistory(chatHistoryTyped, "urban_report");
  const hasUrbanContext = (urbanAccumulated.category || urbanAccumulated.description) &&
    (lib.isGenericIntentText(String(urbanAccumulated.description || "")) === false || urbanAccumulated.category);
  const assistantAskedForAddress =
    /qual\s*(é|e)\s*(a\s*)?(avenida|rua)|CEP\s*do\s*local|endere[cç]o\s*do\s*local|onde\s*fica/i.test(
      lastAssistantText,
    ) ||
    /\[COLLECTION_PROGRESS:urban_report\]/i.test(lastAssistantText);

  return !!(hasUrbanContext && assistantAskedForAddress);
}

export async function resolveCollectionIntent(
  args: ResolveCollectionIntentArgs,
): Promise<ResolveCollectionIntentResult> {
  const {
    chatHistoryTyped,
    chatMessages,
    corsHeaders,
    frontendCollectionType,
    lastAssistantText,
    lastUserMsg,
    lib,
  } = args;

  const journeySwitchMatch = lastUserMsg.match(/\[JOURNEY_SWITCHED:(\w+)\]/);
  const journeyDeclinedMatch = lastUserMsg.match(/\[JOURNEY_DECLINED:(\w+)\]/);
  const journeySwitched = !!journeySwitchMatch;
  const journeyDeclined = !!journeyDeclinedMatch;

  // Refinamento de filtros de uma busca de serviços ("Raio: Xkm. Avaliação mínima: ...").
  // Continuação inequívoca da busca por proximidade — força `services` ANTES de qualquer ramo
  // baseado em `frontendCollectionType`. Os ramos de light-journey confiam no collectionType
  // enviado pelo app (que pode ter revertido para general/null após os resultados) e NÃO
  // consultam detectCollectionIntent; sem isto a mensagem caía na LLM, que só "explicava" a
  // frase. "Raio:" é exclusivo do chip de filtro de proximidade. Não dispara em troca de jornada.
  if (!journeySwitched && /\braio\s*:\s*\d/i.test(lastUserMsg)) {
    console.log("[ai-orchestrator] Services filter refinement (Raio/Avaliação) → forçando intent services");
    return {
      collectionIntent: { type: "services", fields: {} },
      journeyDeclined,
      journeySwitched,
    };
  }

  let collectionIntent: CollectionIntent | null = null;

  if (journeySwitchMatch) {
    const switchedToType = journeySwitchMatch[1];
    console.log("[ai-orchestrator] JOURNEY_SWITCHED detected in message, forcing type:", switchedToType);

    if (STRUCTURED_TYPES_SET.has(switchedToType)) {
      collectionIntent = {
        type: switchedToType as "urban_report" | "transport_report" | "service_rating",
        fields: {},
      };
    } else {
      collectionIntent = {
        type: switchedToType as CollectionIntent["type"],
        fields: {},
      };
    }
  }

  if (journeyDeclinedMatch) {
    const declinedType = journeyDeclinedMatch[1];
    console.log("[ai-orchestrator] User declined switch to:", declinedType, "- continuing current journey");

    if (frontendCollectionType && STRUCTURED_TYPES_SET.has(frontendCollectionType)) {
      const feStructured = frontendCollectionType as CollectionIntent["type"];
      collectionIntent = {
        type: feStructured as "urban_report" | "transport_report" | "service_rating",
        fields: lib.accumulateFieldsFromHistory(chatHistoryTyped, feStructured),
      };
    }
  } else if (frontendCollectionType && STRUCTURED_TYPES_SET.has(frontendCollectionType)) {
    console.log("[ai-orchestrator] Frontend collectionType received:", frontendCollectionType);

    const declinedJourneys = getDeclinedJourneys(chatMessages);
    if (declinedJourneys.size > 0) {
      console.log("[ai-orchestrator] Declined journeys in history:", Array.from(declinedJourneys));
    }

    const detectedIntent = lib.detectCollectionIntent(lastUserMsg, chatHistoryTyped);
    const isDetectedStructured = detectedIntent &&
      STRUCTURED_TYPES.includes(detectedIntent.type as (typeof STRUCTURED_TYPES)[number]);
    const wasRecentlyDeclined = detectedIntent && declinedJourneys.has(detectedIntent.type);

    let isJourneyConflict = !!(
      detectedIntent &&
      isDetectedStructured &&
      detectedIntent.type !== frontendCollectionType &&
      !wasRecentlyDeclined
    );

    const confirmationPhrase = /^\s*sim\s*[,.]?\s*(quero\s+)?iniciar\s+/i.test(lastUserMsg.trim()) ||
      /\[JOURNEY_SWITCHED:\w+\]/i.test(lastUserMsg);
    if (isJourneyConflict && detectedIntent && confirmationPhrase) {
      const nameForNew = JOURNEY_NAMES[detectedIntent.type];
      if (nameForNew && lastUserMsg.toLowerCase().includes(nameForNew.toLowerCase())) {
        isJourneyConflict = false;
        collectionIntent = {
          type: detectedIntent.type as "urban_report" | "transport_report" | "service_rating",
          fields: {},
        };
        console.log(
          "[ai-orchestrator] User already confirmed switch to",
          detectedIntent.type,
          "- skipping duplicate confirmation prompt",
        );
      }
    }

    if (wasRecentlyDeclined) {
      console.log(`[ai-orchestrator] Journey ${detectedIntent?.type} was recently declined, skipping confirmation`);
    }

    if (isJourneyConflict && detectedIntent) {
      const currentName = JOURNEY_NAMES[frontendCollectionType] || frontendCollectionType;
      const newName = JOURNEY_NAMES[detectedIntent.type] || detectedIntent.type;
      const existingFields = lib.accumulateFieldsFromHistory(chatHistoryTyped, frontendCollectionType as CollectionIntent["type"]);
      const rawFieldKeys = Object.keys(existingFields).filter((key) => !key.startsWith("_"));
      let meaningfulFieldCount = rawFieldKeys.length;

      if (existingFields.description && lib.isGenericIntentText(String(existingFields.description))) {
        meaningfulFieldCount = Math.max(0, meaningfulFieldCount - 1);
      }

      const progressNote = meaningfulFieldCount > 0
        ? ` (você já informou ${meaningfulFieldCount} dado${meaningfulFieldCount > 1 ? "s" : ""})`
        : "";
      const confirmationResponse = buildJourneySwitchPrompt(
        frontendCollectionType,
        String(detectedIntent.type),
        currentName,
        newName,
        progressNote,
      );

      console.log("[ai-orchestrator] Returning journey switch confirmation with buttons");
      return {
        collectionIntent,
        journeyDeclined,
        journeySwitched,
        response: createSseResponse(confirmationResponse, corsHeaders),
      };
    }

    if (!collectionIntent) {
      console.log("[ai-orchestrator] Using frontend collectionType:", frontendCollectionType);
      collectionIntent = {
        type: frontendCollectionType as "urban_report" | "transport_report" | "service_rating",
        fields: detectedIntent?.fields || {},
      };
    }
  } else if (frontendCollectionType && LIGHT_JOURNEY_TYPES.includes(frontendCollectionType as (typeof LIGHT_JOURNEY_TYPES)[number])) {
    console.log("[ai-orchestrator] Frontend light journey received:", frontendCollectionType);

    const hasExplicitSwitch = EXPLICIT_SWITCH_KEYWORDS.some((keyword) => lastUserMsg.toLowerCase().includes(keyword));
    if (hasExplicitSwitch) {
      const detectedIntent = lib.detectCollectionIntent(lastUserMsg, chatHistoryTyped);
      if (detectedIntent && STRUCTURED_TYPES_SET.has(detectedIntent.type)) {
        console.log("[ai-orchestrator] Explicit switch from light journey to structured:", detectedIntent.type);

        const currentName = JOURNEY_NAMES[frontendCollectionType] || frontendCollectionType;
        const newName = JOURNEY_NAMES[String(detectedIntent.type)] || String(detectedIntent.type);
        const confirmationResponse = `[JOURNEY_SWITCH_PROMPT:${String(detectedIntent.type)}:${frontendCollectionType}]` +
          `Entendi! Você quer iniciar uma **${newName}**.\n\n` +
          `Você estava em **${currentName}**. Deseja trocar?`;

        console.log("[ai-orchestrator] Returning journey switch confirmation prompt");
        return {
          collectionIntent,
          journeyDeclined,
          journeySwitched,
          response: createSseResponse(confirmationResponse, corsHeaders),
        };
      }

      collectionIntent = { type: frontendCollectionType as CollectionIntent["type"], fields: {} };
    } else {
      if (
        frontendCollectionType === "services" &&
        shouldPreserveUrbanContext({
          chatHistoryTyped,
          frontendCollectionType,
          lastAssistantText,
          lastUserMsg,
          lib,
        })
      ) {
        collectionIntent = { type: "urban_report", fields: {} };
        console.log(
          "[ai-orchestrator] Overriding services → urban_report: address confirmation in urban report context",
        );
      }
      if (!collectionIntent) {
        collectionIntent = { type: frontendCollectionType as CollectionIntent["type"], fields: {} };
      }
    }
  } else {
    if (shouldPreserveUrbanContext({ chatHistoryTyped, lastAssistantText, lastUserMsg, lib })) {
      collectionIntent = { type: "urban_report", fields: {} };
      console.log("[ai-orchestrator] Preserving urban_report context: last message is address confirmation");
    }
    if (!collectionIntent) {
      collectionIntent = lib.detectCollectionIntent(lastUserMsg, chatHistoryTyped);
    }
  }

  if (collectionIntent && collectionIntent.type !== "general" && lib.isInformationalQuestionAboutAudience(lastUserMsg)) {
    console.log("[ai-orchestrator] Overriding intent to general: informational question about audiência → RAG");
    collectionIntent = { type: "general", fields: {} };
  }
  if (collectionIntent && collectionIntent.type !== "general" && lib.isInformationalQuestionAboutContact(lastUserMsg)) {
    console.log("[ai-orchestrator] Overriding intent to general: contact question (como entrar em contato) → RAG");
    collectionIntent = { type: "general", fields: {} };
  }
  if (
    collectionIntent &&
    collectionIntent.type !== "general" &&
    lib.isInformationalQuestionAboutProjetosTramitacao(lastUserMsg)
  ) {
    console.log("[ai-orchestrator] Overriding intent to general: projetos em tramitação → RAG");
    collectionIntent = { type: "general", fields: {} };
  }
  if (collectionIntent && collectionIntent.type !== "general" && lib.isInformationalQuestionAboutBuscarAudiencia(lastUserMsg)) {
    console.log("[ai-orchestrator] Overriding intent to general: buscar audiência pública → RAG");
    collectionIntent = { type: "general", fields: {} };
  }
  if (collectionIntent && collectionIntent.type !== "general" && lib.isOutOfScopeQuestion(lastUserMsg)) {
    console.log(
      "[ai-orchestrator] Overriding intent to general: pergunta fora do escopo (shopping/restaurante/prefeito/multa) → RAG",
    );
    collectionIntent = { type: "general", fields: {} };
  }
  if (collectionIntent && collectionIntent.type !== "general" && lib.isInformationalQuestionAboutVereadorOrCamara(lastUserMsg)) {
    console.log("[ai-orchestrator] Overriding intent to general: pergunta informativa vereador/câmara → RAG");
    collectionIntent = { type: "general", fields: {} };
  }

  if (!journeySwitched && (!collectionIntent || collectionIntent.type === "general")) {
    const userMessages = chatMessages.filter((message: Record<string, unknown>) => message.role === "user");
    const nOpen = userMessages.length;
    const lastOpen = String(lastUserMsg || "").trim();
    const firstOpen = nOpen >= 1 ? String(userMessages[0].content || "").trim() : "";
    const openFirstNature = lib.normalizeReportNature(firstOpen) !== null;
    const openFirstGreet = firstOpen.length > 0 &&
      firstOpen.length <= 24 &&
      /^(oi|ol[aá]|opa|hey|bom\s+dia|boa\s+tarde|boa\s+noite)\b/i.test(firstOpen);
    const openEligible = (nOpen === 1 && lastOpen === String(userMessages[0].content || "").trim()) ||
      (nOpen === 2 &&
        lastOpen === String(userMessages[1].content || "").trim() &&
        (openFirstNature || openFirstGreet));

    if (
      openEligible &&
      lib.messageLooksLikeUrbanIncidentStarter(lastOpen) &&
      lib.isValidDomainDescription(lastOpen, "urban") &&
      !lib.isGenericIntentText(lastOpen) &&
      !lib.isBareUrbanReportNatureReply(lastOpen)
    ) {
      collectionIntent = { type: "urban_report", fields: {} };
      console.log("[ai-orchestrator] Forced urban_report: abertura com incidente na cidade");
    }
  }

  return {
    collectionIntent,
    journeyDeclined,
    journeySwitched,
  };
}
