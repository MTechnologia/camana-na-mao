import {
  assistantAnsweredUrbanNonComplaintQuestion,
  buildUrbanNonComplaintFarewellMessage,
  extractReportNatureFromChat,
  userAcknowledgedUrbanNonComplaintAnswer,
} from "./lib-conversation-closing.ts";
import { createSseResponse } from "./lib-index-sse.ts";

type UrbanNonComplaintClosingArgs = {
  accumulatedFields: Record<string, unknown>;
  chatMessages: Array<Record<string, unknown>>;
  corsHeaders: Record<string, string>;
  lastAssistantText: string;
  lastUserTextEarly: string;
  lib: typeof import("./lib.ts");
};

type UrbanNonComplaintClosingResult = {
  response?: Response;
};

/**
 * Após dúvida/sugestão/elogio respondida, o cidadão agradece → encerramento humanizado + estrelas.
 * Sem encaminhamento para vereador.
 */
export async function handleUrbanNonComplaintClosingShortcut(
  args: UrbanNonComplaintClosingArgs,
): Promise<UrbanNonComplaintClosingResult> {
  const {
    accumulatedFields,
    chatMessages,
    corsHeaders,
    lastAssistantText,
    lastUserTextEarly,
    lib,
  } = args;

  if (!userAcknowledgedUrbanNonComplaintAnswer(lastUserTextEarly)) {
    return {};
  }

  if (!assistantAnsweredUrbanNonComplaintQuestion(
    lastAssistantText,
    accumulatedFields,
    lib.isUrbanNonComplaintReadyForLlmTurn,
  )) {
    return {};
  }

  const reportNature = extractReportNatureFromChat(chatMessages) ??
    String(accumulatedFields.report_nature ?? "");

  const reply = buildUrbanNonComplaintFarewellMessage(reportNature);
  console.log(
    "[ai-orchestrator] Urban non-complaint farewell → channel rating offer, nature:",
    reportNature || "(unknown)",
  );
  return { response: createSseResponse(reply, corsHeaders) };
}
