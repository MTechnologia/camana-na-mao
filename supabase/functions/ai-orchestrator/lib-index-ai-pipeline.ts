import type { SupabaseClient } from "@supabase/supabase-js";

import type { CollectionIntent } from "./lib.ts";
import { callAiChatCompletion } from "./lib-index-ai-api.ts";
import { handleAiNonStreamResponse, handleAiStreamFallback } from "./lib-index-ai-fallback.ts";
import { handleAiToolCall, parseAiSseResponse } from "./lib-index-ai-stream.ts";
import { handleDeterministicShortcuts } from "./lib-index-deterministic-shortcuts.ts";
import { buildPromptContextAndTools } from "./lib-index-prompt-context.ts";
import { createSseResponse } from "./lib-index-sse.ts";

type NextFieldInfo = { field: string | null; picker: string | null; prompt: string | null };

type AiPipelineArgs = {
  accumulatedFields: Record<string, unknown>;
  aiChatModel: string;
  attachmentUrls: string[];
  chatMessages: Array<Record<string, unknown>>;
  collectionIntent: CollectionIntent | null;
  dynamicSystemPrompt: string;
  finalAiApiKey: string;
  finalAiBaseUrl: string;
  journeySwitched: boolean;
  lastAssistantLower: string;
  lastUserMessage: string;
  lastUserMsg: string;
  lightJourneyMarker: string;
  msgLower: string;
  nextFieldInfo: NextFieldInfo;
  requestStartTime: number;
  supabase: SupabaseClient;
  userId: string;
  vertexRagCorpus?: string;
  vertexRagDatastore?: string;
  vertexTokenObtained: boolean;
  vertexTokenUrl?: string;
  lib: typeof import("./lib.ts");
  deps?: {
    buildPromptContextAndTools?: typeof buildPromptContextAndTools;
    callAiChatCompletion?: typeof callAiChatCompletion;
    handleAiNonStreamResponse?: typeof handleAiNonStreamResponse;
    handleAiStreamFallback?: typeof handleAiStreamFallback;
    handleAiToolCall?: typeof handleAiToolCall;
    handleDeterministicShortcuts?: typeof handleDeterministicShortcuts;
    parseAiSseResponse?: typeof parseAiSseResponse;
  };
};

export async function runAiPipeline(args: AiPipelineArgs): Promise<Response> {
  const {
    accumulatedFields,
    aiChatModel,
    attachmentUrls,
    chatMessages,
    collectionIntent,
    dynamicSystemPrompt,
    finalAiApiKey,
    finalAiBaseUrl,
    journeySwitched,
    lastAssistantLower,
    lastUserMessage,
    lastUserMsg,
    lightJourneyMarker,
    msgLower,
    nextFieldInfo,
    requestStartTime,
    supabase,
    userId,
    vertexRagCorpus,
    vertexRagDatastore,
    vertexTokenObtained,
    vertexTokenUrl,
    lib,
    deps,
  } = args;

  const handleDeterministicShortcutsImpl = deps?.handleDeterministicShortcuts ?? handleDeterministicShortcuts;
  const buildPromptContextAndToolsImpl = deps?.buildPromptContextAndTools ?? buildPromptContextAndTools;
  const callAiChatCompletionImpl = deps?.callAiChatCompletion ?? callAiChatCompletion;
  const parseAiSseResponseImpl = deps?.parseAiSseResponse ?? parseAiSseResponse;
  const handleAiToolCallImpl = deps?.handleAiToolCall ?? handleAiToolCall;
  const handleAiStreamFallbackImpl = deps?.handleAiStreamFallback ?? handleAiStreamFallback;
  const handleAiNonStreamResponseImpl = deps?.handleAiNonStreamResponse ?? handleAiNonStreamResponse;

  const deterministicShortcutsResult = await handleDeterministicShortcutsImpl({
    accumulatedFields,
    chatMessages,
    collectionIntent,
    journeySwitched,
    lastUserMessage,
    lastUserMsg,
    msgLower,
    nextFieldInfo,
    requestStartTime,
    supabase,
    lib,
  });
  if (deterministicShortcutsResult.response) {
    return deterministicShortcutsResult.response;
  }

  const promptContext = await buildPromptContextAndToolsImpl({
    accumulatedFields,
    aiChatModel,
    collectionIntent,
    dynamicSystemPrompt,
    finalAiApiKey,
    finalAiBaseUrl,
    lastUserMessage,
    lib,
    supabase,
    userId,
    vertexRagCorpus,
    vertexRagDatastore,
  });
  if (promptContext.shortCircuitResponse) {
    return promptContext.shortCircuitResponse;
  }

  const aiApiResult = await callAiChatCompletionImpl({
    aiChatModel,
    chatMessages,
    corsHeaders: lib.corsHeaders,
    dynamicSystemPrompt: promptContext.dynamicSystemPrompt,
    effectiveTools: promptContext.effectiveTools,
    finalAiApiKey,
    finalAiBaseUrl,
    requestStartTime,
    vertexTokenObtained,
    vertexTokenUrl,
  });
  if (aiApiResult.errorResponse) {
    return aiApiResult.errorResponse;
  }
  const response = aiApiResult.response!;
  const contentType = response.headers.get("content-type") || "";
  console.log("[ai-orchestrator] Response content-type:", contentType);

  if (contentType.includes("text/event-stream") && response.body) {
    const {
      fullContent,
      multipleToolCallsDetected,
      thoughtSignatureDetected,
      toolCallData,
      toolCallArguments,
    } = await parseAiSseResponseImpl(response);

    if (thoughtSignatureDetected) {
      console.warn(
        "[ai-orchestrator] SSE response contains thought signature markers. Gemini 3 multi-turn tool calling may require preserving provider state between turns.",
      );
    }
    if (multipleToolCallsDetected) {
      console.warn(
        "[ai-orchestrator] Multiple tool calls detected in a single SSE response. Current pipeline executes only the first resolved tool call.",
      );
    }

    if (toolCallData?.name) {
      try {
        const toolArgs = JSON.parse(toolCallArguments);
        return await handleAiToolCallImpl({
          accumulatedFields,
          attachmentUrls,
          collectionIntent,
          lastAssistantLower,
          lightJourneyMarker,
          mode: "stream",
          requestStartTime,
          supabase,
          userId,
          lib,
          toolName: toolCallData.name,
          toolArgs,
        });
      } catch (error) {
        console.error("[ai-orchestrator] Tool execution error:", error);
        console.log("[ai-orchestrator] Request completed in", Date.now() - requestStartTime, "ms (tool error)");
        return createSseResponse(
          "Desculpe, houve um erro ao processar sua solicitacao. Pode tentar novamente?",
          lib.corsHeaders,
        );
      }
    }

    return await handleAiStreamFallbackImpl({
      accumulatedFields,
      collectionIntent,
      fullContent,
      lastUserMsg,
      lightJourneyMarker,
      nextFieldInfo,
      requestStartTime,
      supabase,
      lib,
    });
  }

  return await handleAiNonStreamResponseImpl({
    accumulatedFields,
    attachmentUrls,
    collectionIntent,
    lastAssistantLower,
    requestStartTime,
    response,
    supabase,
    userId,
    lib,
  });
}
