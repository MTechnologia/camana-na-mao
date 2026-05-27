/// <reference path="./deno-runtime-shim.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { CollectionIntent } from "./lib.ts";
import { buildAccumulatedContext } from "./lib-index-accumulated-context.ts";
import { runAiPipeline } from "./lib-index-ai-pipeline.ts";
import { initializeRequestBootstrap } from "./lib-index-bootstrap.ts";
import { orchestrateCollectionTurn } from "./lib-index-collection-orchestration.ts";
import { handleChannelRatingShortcut } from "./lib-index-channel-rating-shortcut.ts";
import { handleCouncilShortcuts } from "./lib-index-council-shortcuts.ts";
import { handleGeneralJourneyClosingShortcut } from "./lib-index-general-closing.ts";
import { handleServicesJourneyClosingShortcut } from "./lib-index-services-closing.ts";
import { handleUrbanNonComplaintClosingShortcut } from "./lib-index-urban-non-complaint-closing.ts";
import { resolveCollectionIntent } from "./lib-index-collection-intent.ts";
import {
  handleAiFatalError,
} from "./lib-index-ai-fallback.ts";
import { handleDeterministicServicesFlow } from "./lib-index-services-flow.ts";
import { getMessageText, handlePreAiShortcuts } from "./lib-index-pre-ai-shortcuts.ts";
import {
  analyzeConversationTone,
  buildConversationToneInstruction,
} from "./lib-conversation-tone.ts";
import {
  buildVersionedSystemPrompt,
  loadActiveAiConfigVersion,
  resolveEffectiveAiChatModel,
} from "./lib-ai-config-version.ts";
import { buildChatCompletionsModel, isVertexAiProvider } from "../_shared/ai-provider.ts";

// CORS para preflight: entrypoint NÃO importa lib para OPTIONS passar mesmo se lib falhar no cold start
const PREFLIGHT_CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: PREFLIGHT_CORS });
  }

  try {
  const requestStartTime = Date.now();
  const lib = await import("./lib.ts");
  console.log('[ai-orchestrator] ========== REQUEST RECEIVED ==========');
  console.log('[ai-orchestrator] DEPLOY VERSION: 2026-06-04-v1 (ai_config_versions ativa + prompt institucional)');
  console.log('[ai-orchestrator] Request started at', new Date().toISOString());
  console.log('[ai-orchestrator] Method:', req.method);
  console.log('[ai-orchestrator] URL:', req.url);

  try {
    const bootstrap = await initializeRequestBootstrap({
      corsHeaders: lib.corsHeaders,
      req,
    });
    if (bootstrap.response) {
      return bootstrap.response;
    }
    const bootstrapCtx = bootstrap.context!;
    const {
      aiChatModel: secretAiChatModel,
      attachmentUrls,
      chatHistoryTyped,
      chatMessages,
      conversationId,
      evaluationContext,
      finalAiApiKey,
      finalAiBaseUrl,
      frontendCollectionType,
      lastAssistantContent,
      lastAssistantText,
      lastAssistantTextEarly,
      lastUserMsg,
      lastUserTextEarly,
      supabase,
      supabaseClassificationFeedbackRead,
      user,
      vertexRagCorpus,
      vertexRagDatastore,
      vertexTokenObtained,
      vertexTokenUrl,
    } = bootstrapCtx;

    const activeAiConfig = await loadActiveAiConfigVersion({
      supabaseAdmin: supabaseClassificationFeedbackRead,
    });
    const baseSystemPrompt = activeAiConfig
      ? buildVersionedSystemPrompt(lib.systemPrompt, activeAiConfig)
      : lib.systemPrompt;
    const aiChatModel = resolveEffectiveAiChatModel(secretAiChatModel, activeAiConfig?.modelId);
    const isVertex = isVertexAiProvider(finalAiBaseUrl, vertexTokenUrl);
    const chatCompletionsModel = buildChatCompletionsModel(aiChatModel, isVertex);
    if (activeAiConfig && aiChatModel !== secretAiChatModel) {
      console.log("[ai-orchestrator] Modelo da versão ativa:", {
        secret: secretAiChatModel,
        effective: aiChatModel,
        apiModel: chatCompletionsModel,
        version: activeAiConfig.versionLabel,
      });
    }

    const councilShortcutResult = await handleCouncilShortcuts({
      chatMessages,
      corsHeaders: lib.corsHeaders,
      lastAssistantContent,
      lastAssistantText,
      lastAssistantTextEarly,
      lastUserTextEarly,
      supabase,
      userId: user.id,
      lib,
    });
    if (councilShortcutResult.response) {
      return councilShortcutResult.response;
    }

    const channelRatingResult = await handleChannelRatingShortcut({
      chatMessages,
      conversationId: typeof conversationId === "string" ? conversationId : undefined,
      corsHeaders: lib.corsHeaders,
      lastAssistantText,
      lastUserTextEarly,
      supabase,
      userId: user.id,
    });
    if (channelRatingResult.response) {
      return channelRatingResult.response;
    }

    const resolvedIntent = await resolveCollectionIntent({
      chatHistoryTyped,
      chatMessages,
      corsHeaders: lib.corsHeaders,
      frontendCollectionType,
      lastAssistantText,
      lastUserMsg,
      lib,
    });
    if (resolvedIntent.response) {
      return resolvedIntent.response;
    }
    let collectionIntent: CollectionIntent | null = resolvedIntent.collectionIntent;
    const journeySwitched = resolvedIntent.journeySwitched;
    const journeyDeclined = resolvedIntent.journeyDeclined;
    
    const accumulatedContext = await buildAccumulatedContext({
      chatHistoryTyped,
      chatMessages,
      collectionIntent,
      evaluationContext,
      journeyDeclined,
      journeySwitched,
      lastUserMsg,
      lib,
    });
    let accumulatedFields: Record<string, unknown> = accumulatedContext.accumulatedFields;

    const urbanNonComplaintClosingResult = await handleUrbanNonComplaintClosingShortcut({
      accumulatedFields,
      chatMessages,
      corsHeaders: lib.corsHeaders,
      lastAssistantText,
      lastUserTextEarly,
      lib,
    });
    if (urbanNonComplaintClosingResult.response) {
      return urbanNonComplaintClosingResult.response;
    }

    const servicesClosingResult = await handleServicesJourneyClosingShortcut({
      accumulatedFields,
      chatMessages,
      collectionIntent,
      corsHeaders: lib.corsHeaders,
      lastAssistantText,
      lastUserTextEarly,
    });
    if (servicesClosingResult.response) {
      return servicesClosingResult.response;
    }

    const generalClosingResult = await handleGeneralJourneyClosingShortcut({
      chatMessages,
      collectionIntent,
      corsHeaders: lib.corsHeaders,
      lastAssistantText,
      lastUserTextEarly,
    });
    if (generalClosingResult.response) {
      return generalClosingResult.response;
    }
    
    // Build dynamic system prompt with collected fields context (base = versão ativa + prompt operacional)
    let dynamicSystemPrompt = baseSystemPrompt;
    
    // === LIGHT JOURNEY MARKER ===
    const lightJourneyMarker = accumulatedContext.lightJourneyMarker;
    
    const lastUserMessage = getMessageText(chatMessages.filter((m: Record<string, unknown>) => m.role === 'user').pop() || {});
    const msgLower = lastUserMessage.toLowerCase().trim();
    const lastAssistantMessage = getMessageText(chatMessages.filter((m: Record<string, unknown>) => m.role === 'assistant').pop() || {});
    const lastAssistantLower = lastAssistantMessage.toLowerCase();
    const toneInstruction = buildConversationToneInstruction(analyzeConversationTone(lastUserMessage));
    if (toneInstruction) {
      dynamicSystemPrompt = `${dynamicSystemPrompt}\n\n${toneInstruction}`;
    }
    const preAiShortcutResult = await handlePreAiShortcuts({
      accumulatedFields,
      chatMessages,
      collectionIntent,
      lastAssistantMessage,
      lastUserMessage,
      lightJourneyMarker,
      msgLower,
      supabase,
      userId: user.id,
      lib,
    });
    if (preAiShortcutResult.response) {
      return preAiShortcutResult.response;
    }

    const collectionTurn = await orchestrateCollectionTurn({
      accumulatedFields,
      attachmentUrls,
      baseSystemPrompt,
      chatMessages,
      collectionIntent,
      conversationId,
      dynamicSystemPrompt,
      getMessageText,
      lastAssistantLower,
      lastAssistantMessage,
      lastUserMessage,
      lightJourneyMarker,
      msgLower,
      requestStartTime,
      supabase,
      supabaseClassificationFeedbackRead,
      userId: user.id,
      lib,
    });
    if (collectionTurn.response) {
      return collectionTurn.response;
    }
    dynamicSystemPrompt = collectionTurn.dynamicSystemPrompt;
    let nextFieldInfo = collectionTurn.nextFieldInfo;
    
    // === LIGHT JOURNEY: services — resposta determinística (perguntar tipo → CEP) ou chamar find_nearby_services
    if (collectionIntent?.type === 'services') {
      const servicesFlowResult = await handleDeterministicServicesFlow({
        accumulatedFields,
        chatMessages,
        lastAssistantText,
        lastUserMessage,
        lightJourneyMarker,
        nextFieldInfo,
        supabase,
        userId: user.id,
        lib,
      });
      if (servicesFlowResult.response) {
        return servicesFlowResult.response;
      }
    }

    return await runAiPipeline({
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
      userId: user.id,
      vertexRagCorpus,
      vertexRagDatastore,
      vertexTokenObtained,
      vertexTokenUrl,
      lib,
    });
    
  } catch (error) {
    return handleAiFatalError(error, requestStartTime, lib.corsHeaders);
  }
  } catch (loadOrHandlerError) {
    const err = loadOrHandlerError instanceof Error ? loadOrHandlerError : new Error(String(loadOrHandlerError));
    console.error('[ai-orchestrator] Load or handler error:', err.message);
    console.error('[ai-orchestrator] Stack:', err.stack);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: err.message }),
      { status: 500, headers: { ...PREFLIGHT_CORS, 'Content-Type': 'application/json' } }
    );
  }
});
