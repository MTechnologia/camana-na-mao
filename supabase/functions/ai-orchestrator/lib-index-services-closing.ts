import {
  buildServicesJourneyFarewellMessage,
  isServicesJourneyFarewellPending,
} from "./lib-conversation-closing.ts";
import { createSseResponse } from "./lib-index-sse.ts";
import type { CollectionIntent } from "./lib.ts";

type ServicesClosingArgs = {
  accumulatedFields: Record<string, unknown>;
  chatMessages: Array<Record<string, unknown>>;
  collectionIntent: CollectionIntent | null;
  corsHeaders: Record<string, string>;
  lastAssistantText: string;
  lastUserTextEarly: string;
};

type ServicesClosingResult = {
  response?: Response;
};

/**
 * Após busca de serviços próximos / rota, o cidadão agradece → encerramento humanizado + estrelas.
 * Evita reexecutar find_nearby_services.
 */
export async function handleServicesJourneyClosingShortcut(
  args: ServicesClosingArgs,
): Promise<ServicesClosingResult> {
  const {
    accumulatedFields,
    chatMessages,
    collectionIntent,
    corsHeaders,
    lastAssistantText,
    lastUserTextEarly,
  } = args;

  if (!isServicesJourneyFarewellPending(
    collectionIntent?.type,
    accumulatedFields,
    lastUserTextEarly,
    lastAssistantText,
    chatMessages,
  )) {
    return {};
  }

  const reply = buildServicesJourneyFarewellMessage();
  console.log("[ai-orchestrator] Services journey farewell → channel rating offer");
  return { response: createSseResponse(reply, corsHeaders) };
}
