import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildTransportAccessibilityChecklistRequest,
  buildTransportInterceptPreview,
  buildTransportStopLocationRequest,
  buildTransportStopNameRequest,
  buildTransportSubcategoryRequest,
  hasTransportAccessibilityDetails,
  maybeCreateSimilarTransportReportsResponse,
} from "./lib-index-transport-shared.ts";
import { createSseResponse } from "./lib-index-sse.ts";
import type { CollectionIntent } from "./lib.ts";

export type StreamToolCallInfo = {
  name: string;
  id?: string;
};

export type ParsedAiSseResponse = {
  fullContent: string;
  multipleToolCallsDetected: boolean;
  thoughtSignatureDetected: boolean;
  toolCallData: StreamToolCallInfo | null;
  toolCallArguments: string;
};

type HandleAiToolCallArgs = {
  accumulatedFields: Record<string, unknown>;
  attachmentUrls: string[];
  collectionIntent: CollectionIntent | null;
  lastAssistantLower: string;
  lightJourneyMarker?: string;
  mode: "stream" | "non-stream";
  requestStartTime: number;
  supabase: SupabaseClient;
  userId: string;
  lib: typeof import("./lib.ts");
  toolName: string;
  toolArgs: Record<string, unknown>;
};

function buildMergedTransportFields(
  accumulatedFields: Record<string, unknown>,
  toolArgs: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...accumulatedFields,
    description: toolArgs.description ?? accumulatedFields.description,
    report_type: toolArgs.report_type ?? accumulatedFields.report_type,
    sub_category: toolArgs.sub_category ?? accumulatedFields.sub_category,
    line_code: toolArgs.line_code ?? accumulatedFields.line_code,
    line_id: toolArgs.line_id ?? accumulatedFields.line_id,
    occurrence_date: toolArgs.occurrence_date ?? accumulatedFields.occurrence_date,
    occurrence_time: toolArgs.occurrence_time ?? accumulatedFields.occurrence_time,
    direction: toolArgs.direction ?? accumulatedFields.direction,
    recurrence_frequency: toolArgs.recurrence_frequency ?? accumulatedFields.recurrence_frequency,
    location: toolArgs.location ?? accumulatedFields.location,
    stop_name: toolArgs.stop_name ?? accumulatedFields.stop_name,
    stop_location: toolArgs.stop_location ?? accumulatedFields.stop_location,
    accessibility_details: toolArgs.accessibility_details ?? accumulatedFields.accessibility_details,
    severity: toolArgs.severity ?? accumulatedFields.severity,
    subcategory_label: toolArgs.subcategory_label ?? accumulatedFields.subcategory_label,
    personal_impact: toolArgs.personal_impact ?? accumulatedFields.personal_impact,
    impact_description: toolArgs.impact_description ?? accumulatedFields.impact_description,
  };
}

function buildFinalFields(
  accumulatedFields: Record<string, unknown>,
  toolArgs: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...accumulatedFields,
    ...(toolArgs.category && { category: toolArgs.category }),
    ...(toolArgs.description && { description: toolArgs.description }),
    ...(toolArgs.street && { street: toolArgs.street }),
    ...(toolArgs.neighborhood && { neighborhood: toolArgs.neighborhood }),
    ...(toolArgs.cep && { cep: toolArgs.cep }),
    ...(toolArgs.street_number && { street_number: toolArgs.street_number }),
    ...(toolArgs.reference_point && { reference_point: toolArgs.reference_point }),
    ...(toolArgs.risk_level && { risk_level: toolArgs.risk_level }),
    ...(toolArgs.risk_types && { risk_types: toolArgs.risk_types }),
    ...(toolArgs.affected_scope && { affected_scope: toolArgs.affected_scope }),
    ...(toolArgs.affected_estimate && { affected_estimate: toolArgs.affected_estimate }),
    ...(toolArgs.active_consequences && { active_consequences: toolArgs.active_consequences }),
    ...(toolArgs.report_type && { report_type: toolArgs.report_type }),
    ...(toolArgs.sub_category && { sub_category: toolArgs.sub_category }),
    ...(toolArgs.line_code && { line_code: toolArgs.line_code }),
    ...(toolArgs.occurrence_date && { occurrence_date: toolArgs.occurrence_date }),
    ...(toolArgs.occurrence_time && { occurrence_time: toolArgs.occurrence_time }),
    ...(toolArgs.direction && { direction: toolArgs.direction }),
    ...(toolArgs.recurrence_frequency && { recurrence_frequency: toolArgs.recurrence_frequency }),
    ...(toolArgs.severity && { severity: toolArgs.severity }),
    ...(toolArgs.personal_impact != null && toolArgs.personal_impact !== "" && {
      personal_impact: toolArgs.personal_impact,
    }),
    ...(toolArgs.impact_description && { impact_description: toolArgs.impact_description }),
    ...(toolArgs.stop_name && { stop_name: toolArgs.stop_name }),
    ...(toolArgs.stop_location && { stop_location: toolArgs.stop_location }),
    ...(toolArgs.accessibility_details != null &&
        typeof toolArgs.accessibility_details === "object" &&
        !Array.isArray(toolArgs.accessibility_details)
      ? { accessibility_details: toolArgs.accessibility_details }
      : {}),
    ...(toolArgs.service_type && { service_type: toolArgs.service_type }),
    ...(toolArgs.rating_stars && { rating_stars: toolArgs.rating_stars }),
    ...(toolArgs.rating_dimensions && { rating_dimensions: toolArgs.rating_dimensions }),
    ...(toolArgs.sentiment && { sentiment: toolArgs.sentiment }),
  };
}

async function maybeInterceptTransportToolCall(
  accumulatedFields: Record<string, unknown>,
  toolArgs: Record<string, unknown>,
  lastAssistantLower: string,
  mode: "stream" | "non-stream",
  supabase: SupabaseClient,
  userId: string,
  lib: typeof import("./lib.ts"),
): Promise<Response | undefined> {
  const alreadyAskedPhotos =
    /deseja\s+anexar\s+imagens\s+quanto\s+ao\s+problema\s+de\s+transporte|anexar\s+imagens\s+quanto\s+ao\s+problema\s+de\s+transporte/i
      .test(lastAssistantLower || "");
  const alreadyShowedPreview =
    /resumo\s+do\s+relato\s+de\s+transporte|se\s+estiver\s+tudo\s+certo.*registrar/i.test(lastAssistantLower || "");
  const alreadyShowedSimilar =
    /\[SIMILAR_TRANSPORT_REPORTS_B64:/i.test(lastAssistantLower || "");

  if (alreadyAskedPhotos || alreadyShowedPreview) return undefined;

  const merged = buildMergedTransportFields(accumulatedFields, toolArgs);
  const interceptBaseReady =
    Boolean(merged.occurrence_time) &&
    Boolean(merged.direction) &&
    merged.personal_impact != null &&
    merged.personal_impact !== "";
  const interceptReportType = String(merged.report_type || "outro").toLowerCase();
  const interceptSubRaw = merged.sub_category;
  const interceptSubTrimmed =
    interceptSubRaw != null && String(interceptSubRaw).trim() !== "" ? String(interceptSubRaw).trim() : "";
  const interceptSubOk =
    interceptSubTrimmed.length > 0 && lib.isValidTransportSubcategory(interceptReportType, interceptSubTrimmed);

  const modeLabel = mode === "stream" ? "Transport report: intercept" : "Transport report (non-stream): intercept";

  if (interceptBaseReady && !interceptSubOk) {
    console.log(`[ai-orchestrator] ${modeLabel} – missing/invalid sub_category, picker before preview`);
    return createSseResponse(buildTransportSubcategoryRequest(merged, interceptReportType), lib.corsHeaders);
  }

  if (!interceptBaseReady || !interceptSubOk) return undefined;

  if (!merged.stop_name) {
    return createSseResponse(buildTransportStopNameRequest(merged), lib.corsHeaders);
  }

  if (!merged.stop_location) {
    return createSseResponse(buildTransportStopLocationRequest(merged), lib.corsHeaders);
  }

  if (
    interceptReportType === "acessibilidade" &&
    !hasTransportAccessibilityDetails(merged.accessibility_details)
  ) {
    return createSseResponse(buildTransportAccessibilityChecklistRequest(merged), lib.corsHeaders);
  }

  if (!alreadyShowedSimilar) {
    const similarResponse = await maybeCreateSimilarTransportReportsResponse({
      accumulatedFields: merged,
      corsHeaders: lib.corsHeaders,
      logContext: `[ai-orchestrator] ${modeLabel} – similar first, count:`,
      supabase,
      userId,
      lib,
    });
    if (similarResponse) {
      return similarResponse;
    }
  }

  console.log(`[ai-orchestrator] ${modeLabel} – preview + photo choice`);
  return createSseResponse(buildTransportInterceptPreview(merged, lib), lib.corsHeaders);
}

const STRUCTURED_JOURNEY_TYPES = new Set(["urban_report", "transport_report", "service_rating"]);

export function resolveStreamTimeouts(collectionType?: string | null): {
  streamTimeoutMs: number;
  readTimeoutMs: number;
} {
  if (collectionType && STRUCTURED_JOURNEY_TYPES.has(collectionType)) {
    return { streamTimeoutMs: 45_000, readTimeoutMs: 15_000 };
  }
  return { streamTimeoutMs: 30_000, readTimeoutMs: 10_000 };
}

export async function parseAiSseResponse(
  response: Response,
  options?: { collectionType?: string | null },
): Promise<ParsedAiSseResponse> {
  const reader = response.body?.getReader();
  if (!reader) {
    return {
      fullContent: "",
      multipleToolCallsDetected: false,
      thoughtSignatureDetected: false,
      toolCallData: null,
      toolCallArguments: "",
    };
  }

  const decoder = new TextDecoder();
  let fullContent = "";
  let multipleToolCallsDetected = false;
  let thoughtSignatureDetected = false;
  let toolCallData: StreamToolCallInfo | null = null;
  let toolCallArguments = "";
  let textBuffer = "";
  const streamStartTime = Date.now();
  const { streamTimeoutMs: STREAM_TIMEOUT_MS, readTimeoutMs: READ_TIMEOUT_MS } =
    resolveStreamTimeouts(options?.collectionType);

  while (true) {
    if (Date.now() - streamStartTime > STREAM_TIMEOUT_MS) {
      console.warn("[ai-orchestrator] Stream reading timeout after", STREAM_TIMEOUT_MS, "ms");
      reader.cancel();
      break;
    }

    try {
      const readPromise = reader.read();
      let timeoutId: number | undefined;
      const timeoutPromise = new Promise<{ done: true; value: undefined }>((resolve) => {
        timeoutId = setTimeout(() => resolve({ done: true, value: undefined }), READ_TIMEOUT_MS);
      });

      const { done, value } = await Promise.race([readPromise, timeoutPromise]);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      if (done) break;
      if (value) {
        textBuffer += decoder.decode(value, { stream: true });
      }
    } catch (readError) {
      console.warn("[ai-orchestrator] Stream read error:", readError);
      reader.cancel();
      break;
    }
  }

  const lines = textBuffer.split("\n");
  let parsedEvents = 0;
  let contentEvents = 0;
  let toolCallEvents = 0;

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const jsonStr = line.slice(6).trim();
    if (jsonStr === "[DONE]") continue;

    try {
      const parsed = JSON.parse(jsonStr);
      parsedEvents++;
      const delta = parsed.choices?.[0]?.delta;
      const serializedEvent = JSON.stringify(parsed);

      if (delta?.content) {
        fullContent += delta.content;
        contentEvents++;
      }

      if (delta?.tool_calls) {
        toolCallEvents++;
        if ((delta.tool_calls as Array<unknown>).length > 1) {
          multipleToolCallsDetected = true;
        }
        for (const tc of delta.tool_calls as Array<Record<string, unknown>>) {
          const fn = tc.function as Record<string, unknown> | undefined;
          const fnName = fn?.name;
          if (typeof fnName === "string" && fnName.length > 0) {
            const idRaw = tc.id;
            toolCallData = {
              name: fnName,
              id: idRaw != null ? String(idRaw) : undefined,
            };
          }
          const fnArgs = fn?.arguments;
          if (typeof fnArgs === "string") {
            toolCallArguments += fnArgs;
          }
        }
      }

      if (/thought[_\s-]?signature/i.test(serializedEvent)) {
        thoughtSignatureDetected = true;
      }
    } catch {
      console.warn("[ai-orchestrator] Failed to parse SSE line:", line.substring(0, 100));
    }
  }

  console.log("[ai-orchestrator] Stream parsing stats:", {
    totalEvents: parsedEvents,
    contentEvents,
    toolCallEvents,
    contentLength: fullContent.length,
    hasToolCall: !!toolCallData?.name,
    multipleToolCallsDetected,
    thoughtSignatureDetected,
  });
  console.log("[ai-orchestrator] Parsed content:", fullContent.substring(0, 100) || "(empty)");
  console.log("[ai-orchestrator] Tool call detected:", toolCallData?.name || "none");

  return {
    fullContent,
    multipleToolCallsDetected,
    thoughtSignatureDetected,
    toolCallData,
    toolCallArguments,
  };
}

export async function handleAiToolCall(args: HandleAiToolCallArgs): Promise<Response> {
  const {
    accumulatedFields,
    attachmentUrls,
    collectionIntent,
    lastAssistantLower,
    lightJourneyMarker,
    mode,
    requestStartTime,
    supabase,
    userId,
    lib,
    toolName,
  } = args;
  const toolArgs = { ...args.toolArgs };

  if (toolName === "create_urban_report" && attachmentUrls.length > 0) {
    toolArgs.photos = attachmentUrls;
  }
  if (toolName === "create_transport_report" && attachmentUrls.length > 0) {
    toolArgs.photos = attachmentUrls;
  }

  if (toolName === "create_transport_report") {
    const interceptedResponse = await maybeInterceptTransportToolCall(
      accumulatedFields,
      toolArgs,
      lastAssistantLower,
      mode,
      supabase,
      userId,
      lib,
    );
    if (interceptedResponse) {
      return interceptedResponse;
    }
  }

  console.log(
    mode === "stream"
      ? "[ai-orchestrator] Executing tool:"
      : "[ai-orchestrator] Tool call (non-stream):",
    mode === "stream" ? toolName : toolName,
    mode === "stream" ? toolArgs : "",
  );

  const result = await lib.executeTool(toolName, toolArgs, userId, supabase, accumulatedFields);
  const finalFields = buildFinalFields(accumulatedFields, toolArgs);
  console.log("[ai-orchestrator] Final fields for tracker:", Object.keys(finalFields));

  let responseContent = result.message;
  if (lightJourneyMarker && !responseContent.includes("[LIGHT_JOURNEY:")) {
    responseContent = lightJourneyMarker + responseContent;
  }
  if (collectionIntent && !responseContent.includes("[COLLECTION_PROGRESS:")) {
    const fieldsJson = JSON.stringify(finalFields);
    responseContent = `[COLLECTION_PROGRESS:${collectionIntent.type}:${fieldsJson}]${responseContent}`;
  }

  console.log(
    "[ai-orchestrator] Request completed in",
    Date.now() - requestStartTime,
    "ms",
    mode === "stream" ? "(tool call)" : "(non-stream tool)",
  );
  return createSseResponse(responseContent, lib.corsHeaders);
}
