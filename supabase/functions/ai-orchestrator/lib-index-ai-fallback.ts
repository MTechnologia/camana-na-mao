import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildContextualEmptyFallbackMessage,
  extractLastFieldRequestFromHistory,
} from "./lib-contextual-fallback.ts";
import { handleAiToolCall } from "./lib-index-ai-stream.ts";
import { createSseResponse } from "./lib-index-sse.ts";
import type { NextFieldInfo } from "./lib-next-missing-field.ts";
import type { CollectionIntent } from "./lib.ts";

type StreamFallbackArgs = {
  accumulatedFields: Record<string, unknown>;
  chatMessages: Array<{ role: string; content: string }>;
  collectionIntent: CollectionIntent | null;
  fullContent: string;
  lastUserMsg: string;
  lightJourneyMarker?: string;
  nextFieldInfo: NextFieldInfo;
  requestStartTime: number;
  supabase: SupabaseClient;
  lib: typeof import("./lib.ts");
};

type NonStreamAiArgs = {
  accumulatedFields: Record<string, unknown>;
  attachmentUrls: string[];
  collectionIntent: CollectionIntent | null;
  lastAssistantLower: string;
  requestStartTime: number;
  response: Response;
  supabase: SupabaseClient;
  userId: string;
  lib: typeof import("./lib.ts");
};

type NonStreamChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
      tool_calls?: Array<{ function: { name: string; arguments: string } }>;
    };
  }>;
};

async function buildEmptyContentFallback(
  accumulatedFields: Record<string, unknown>,
  collectionIntent: CollectionIntent | null,
  nextFieldInfo: NextFieldInfo,
  chatMessages: Array<{ role: string; content: string }>,
  supabase: SupabaseClient,
  lib: typeof import("./lib.ts"),
): Promise<string> {
  if (collectionIntent && nextFieldInfo.field) {
    const fieldsJson = JSON.stringify(accumulatedFields);
    const progressMarker = `[COLLECTION_PROGRESS:${collectionIntent.type}:${fieldsJson}]`;
    const fieldMarker = `[FIELD_REQUEST:${nextFieldInfo.field}]`;
    const pickerMarker = nextFieldInfo.picker || "";
    let hintsEmpty = "";
    if (
      collectionIntent.type === "service_rating" &&
      nextFieldInfo.field === "rating_dimensions" &&
      accumulatedFields?.service_type
    ) {
      try {
        hintsEmpty = await lib.fetchServiceTypeRatingQuestionHints(
          supabase,
          String(accumulatedFields.service_type),
        );
      } catch {
        /* ignore */
      }
    }
    return `${progressMarker}${fieldMarker}${nextFieldInfo.prompt}${hintsEmpty}${
      pickerMarker ? "\n\n" + pickerMarker : ""
    }`;
  }

  const lastFieldRequest = extractLastFieldRequestFromHistory(chatMessages);
  return buildContextualEmptyFallbackMessage({
    collectionIntent,
    lastFieldRequest,
    nextFieldInfo,
  });
}

export async function handleAiStreamFallback(
  args: StreamFallbackArgs,
): Promise<Response> {
  const {
    accumulatedFields,
    chatMessages,
    collectionIntent,
    fullContent,
    lastUserMsg,
    lightJourneyMarker,
    nextFieldInfo,
    requestStartTime,
    supabase,
    lib,
  } = args;

  let responseContent = fullContent;
  if (!responseContent || responseContent.trim() === "") {
    console.warn("[ai-orchestrator] Empty content received from LLM, using fallback message");
    responseContent = await buildEmptyContentFallback(
      accumulatedFields,
      collectionIntent,
      nextFieldInfo,
      chatMessages,
      supabase,
      lib,
    );
  }

  if (lightJourneyMarker && !responseContent.includes("[LIGHT_JOURNEY:")) {
    responseContent = lightJourneyMarker + responseContent;
  }

  if (collectionIntent && !responseContent.includes("[COLLECTION_PROGRESS:")) {
    const fieldsJson = JSON.stringify(accumulatedFields);
    responseContent = `[COLLECTION_PROGRESS:${collectionIntent.type}:${fieldsJson}]${responseContent}`;
  }

  if (
    collectionIntent?.type === "general" &&
    (lib.isInformationalQuestionAboutBuscarAudiencia(lastUserMsg) || lib.isInformationalQuestionAboutAudience(lastUserMsg))
  ) {
    responseContent += "\n\n[APP_ACTIONS:audiencias]";
  }

  const urbanNonComplaintLlmMode = collectionIntent?.type === "urban_report" &&
    lib.isUrbanNonComplaintReadyForLlmTurn(accumulatedFields);
  const generalCamaraInfoMode = collectionIntent?.type === "general" &&
    responseContent.replace(/\[COLLECTION_PROGRESS:[^\]]+\]/g, "").trim().length >= 80;
  if (urbanNonComplaintLlmMode || generalCamaraInfoMode) {
    responseContent = responseContent.replace(/\n*\[SHOW_SERVICES_CHIPS\]\s*/g, "\n");
    responseContent = responseContent.replace(
      /\n*(?:Posso ajudar com mais alguma coisa\?|Se precisar de mais alguma informação[^.]*\.|Tenha um ótimo dia!?)\s*$/i,
      "",
    ).trimEnd();
  }

  console.log("[ai-orchestrator] Request completed in", Date.now() - requestStartTime, "ms (stream)");
  return createSseResponse(responseContent, lib.corsHeaders);
}

export async function handleAiNonStreamResponse(
  args: NonStreamAiArgs,
): Promise<Response> {
  const {
    accumulatedFields,
    attachmentUrls,
    collectionIntent,
    lastAssistantLower,
    requestStartTime,
    response,
    supabase,
    userId,
    lib,
  } = args;

  const data = (await response.json()) as NonStreamChatCompletion;
  const choice = data.choices?.[0];
  const payloadHasThoughtSignature = /thought[_\s-]?signature/i.test(JSON.stringify(data));

  if (!choice) {
    throw new Error("No response from AI");
  }

  if (choice.message?.tool_calls?.length) {
    if (choice.message.tool_calls.length > 1) {
      console.warn(
        "[ai-orchestrator] Multiple non-stream tool calls received. Current pipeline executes only the first tool call.",
      );
    }
    if (payloadHasThoughtSignature) {
      console.warn(
        "[ai-orchestrator] Non-stream response contains thought signature markers. Gemini 3 follow-up turns may require provider state preservation.",
      );
    }
    const toolCall = choice.message.tool_calls[0];
    const toolName = toolCall.function.name;
    const toolArgs = JSON.parse(toolCall.function.arguments);
    return await handleAiToolCall({
      accumulatedFields,
      attachmentUrls,
      collectionIntent,
      lastAssistantLower,
      mode: "non-stream",
      requestStartTime,
      supabase,
      userId,
      lib,
      toolName,
      toolArgs,
    });
  }

  let content = choice.message?.content || "";
  if (collectionIntent && !content.includes("[COLLECTION_PROGRESS:")) {
    const fieldsJson = JSON.stringify(accumulatedFields);
    content = `[COLLECTION_PROGRESS:${collectionIntent.type}:${fieldsJson}]${content}`;
  }

  console.log("[ai-orchestrator] Request completed in", Date.now() - requestStartTime, "ms (regular)");
  return createSseResponse(content, lib.corsHeaders);
}

export function handleAiFatalError(
  error: unknown,
  requestStartTime: number,
  corsHeaders: Record<string, string>,
): Response {
  console.error("[ai-orchestrator] ========== FATAL ERROR ==========");
  const errObj = error instanceof Error ? error : null;
  console.error(
    "[ai-orchestrator] Error type:",
    errObj && errObj.constructor ? errObj.constructor.name : "unknown",
  );
  console.error("[ai-orchestrator] Error message:", error instanceof Error ? error.message : String(error));
  console.error("[ai-orchestrator] Error stack:", error instanceof Error ? error.stack : "No stack trace");

  try {
    console.error(
      "[ai-orchestrator] Full error object:",
      JSON.stringify(
        error,
        error != null && typeof error === "object" ? Object.getOwnPropertyNames(error as object) : [],
      ),
    );
  } catch (stringifyError) {
    console.error("[ai-orchestrator] Could not stringify error:", stringifyError);
  }

  console.log("[ai-orchestrator] Request completed in", Date.now() - requestStartTime, "ms (error)");
  return createSseResponse("Desculpe, ocorreu um erro inesperado. Por favor, tente novamente.", corsHeaders);
}
