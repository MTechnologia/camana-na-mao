import {
  buildGeneralJourneyFarewellMessage,
  isGeneralJourneyFarewellPending,
} from "./lib-conversation-closing.ts";
import { createSseResponse } from "./lib-index-sse.ts";
import type { CollectionIntent } from "./lib.ts";

type GeneralClosingArgs = {
  chatMessages: Array<Record<string, unknown>>;
  collectionIntent: CollectionIntent | null;
  corsHeaders: Record<string, string>;
  lastAssistantText: string;
  lastUserTextEarly: string;
};

type GeneralClosingResult = {
  response?: Response;
};

/**
 * Após dúvida informativa sobre a Câmara (jornada general), o cidadão agradece →
 * encerramento humanizado + estrelas, sem chips de serviços.
 */
export async function handleGeneralJourneyClosingShortcut(
  args: GeneralClosingArgs,
): Promise<GeneralClosingResult> {
  const {
    chatMessages,
    collectionIntent,
    corsHeaders,
    lastAssistantText,
    lastUserTextEarly,
  } = args;

  if (!isGeneralJourneyFarewellPending(
    collectionIntent?.type,
    lastUserTextEarly,
    lastAssistantText,
    chatMessages,
  )) {
    return {};
  }

  const reply = buildGeneralJourneyFarewellMessage();
  console.log("[ai-orchestrator] General (Câmara) journey farewell → channel rating offer");
  return { response: createSseResponse(reply, corsHeaders) };
}
