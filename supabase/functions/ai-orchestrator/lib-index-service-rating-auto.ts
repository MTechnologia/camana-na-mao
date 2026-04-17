import type { SupabaseClient } from "@supabase/supabase-js";

import { serviceRatingSubmitPreviewJsonMarker } from "./lib-index-transport-preview.ts";
import { createSseResponse } from "./lib-index-sse.ts";

type ExecuteToolResult = {
  success: boolean;
  message: string;
};

type ServiceRatingAutoArgs = {
  accumulatedFields: Record<string, unknown>;
  lastAssistantMessage: string;
  lightJourneyMarker: string;
  msgLower: string;
  supabase: SupabaseClient;
  userId: string;
  lib: typeof import("./lib.ts");
};

type ServiceRatingAutoResult = {
  response?: Response;
  toolResult?: ExecuteToolResult;
};

export async function handleDeterministicServiceRatingAutoCreate(
  args: ServiceRatingAutoArgs,
): Promise<ServiceRatingAutoResult> {
  const {
    accumulatedFields,
    lastAssistantMessage,
    lightJourneyMarker,
    msgLower,
    supabase,
    userId,
    lib,
  } = args;

  const askedRatingSubmitPreview =
    /\[RATING_SUBMIT_PREVIEW\]/i.test(lastAssistantMessage) ||
    /\[RATING_SUBMIT_PREVIEW_JSON:/i.test(lastAssistantMessage);
  const userPublishes =
    /^(publicar|confirmar|sim|ok|enviar)$/i.test(msgLower) ||
    /^confirmar\s+e\s+publicar$/i.test(msgLower);
  const userWantsEditComment = /^(editar|editar_comentario|corrigir)$/i.test(msgLower);

  const ratingTextStr =
    typeof accumulatedFields.rating_text === "string" ? accumulatedFields.rating_text.trim() : "";
  const ratingTextReady = ratingTextStr.length >= 5;
  const lastAskedRatingTextOnly =
    /\[FIELD_REQUEST:rating_text\]/i.test(lastAssistantMessage) && !askedRatingSubmitPreview;

  if (askedRatingSubmitPreview && userWantsEditComment) {
    const fieldsJson = JSON.stringify(accumulatedFields);
    const content =
      (lightJourneyMarker || "") +
      `[COLLECTION_PROGRESS:service_rating:${fieldsJson}]` +
      `[FIELD_REQUEST:rating_text]**Altere seu comentário** (mín. 5 caracteres). Envie o novo texto abaixo.`;
    console.log("[ai-orchestrator] Service rating: edit comment after preview");
    return { response: createSseResponse(content, lib.corsHeaders) };
  }

  if (askedRatingSubmitPreview && !userPublishes && !userWantsEditComment) {
    const remind =
      (lightJourneyMarker || "") +
      `[COLLECTION_PROGRESS:service_rating:${JSON.stringify(accumulatedFields)}]` +
      `[RATING_SUBMIT_PREVIEW]` +
      `Para **publicar** a avaliação, toque em **Publicar** ou responda \`publicar\`. Para ajustar o comentário, use **Editar** ou responda \`editar\`.\n\n[QUICK_REPLY:publicar,editar_comentario]`;
    return { response: createSseResponse(remind, lib.corsHeaders) };
  }

  if (!askedRatingSubmitPreview && lastAskedRatingTextOnly && ratingTextReady) {
    const rd =
      accumulatedFields.rating_dimensions &&
        lib.isCompleteServiceRatingDimensions(accumulatedFields.rating_dimensions)
        ? accumulatedFields.rating_dimensions as Record<string, number>
        : null;
    let stars = typeof accumulatedFields.rating_stars === "number" ? accumulatedFields.rating_stars : 0;
    if (rd && (!stars || stars < 1 || stars > 5)) {
      stars = lib.aggregateRatingDimensionsStars(rd);
    }
    const sn = String(accumulatedFields.service_name || "").trim();
    const dimLine = rd
      ? `\n• **Dimensões:** Tempo ${rd.tempo_espera}/5 · Atendimento ${rd.atendimento}/5 · Infra ${rd.infraestrutura}/5 · Limpeza ${rd.limpeza}/5`
      : "";
    const commentShow = ratingTextStr.length > 400 ? `${ratingTextStr.slice(0, 400)}…` : ratingTextStr;
    const jsonMarker = serviceRatingSubmitPreviewJsonMarker({
      rating_stars: stars,
      rating_dimensions: rd,
      service_name: sn,
      comment_preview: ratingTextStr.slice(0, 500),
    });
    const preview =
      (lightJourneyMarker || "") +
      `[COLLECTION_PROGRESS:service_rating:${JSON.stringify(accumulatedFields)}]` +
      `[RATING_SUBMIT_PREVIEW]**Resumo da avaliação**\n\n` +
      `🏥 **Serviço:** ${sn || "—"}\n⭐ **Nota geral (média):** ${stars}/5${dimLine}\n\n📝 **Comentário:**\n${commentShow}\n\n` +
      `Confirme para **publicar** no sistema ou edite o comentário antes.` +
      jsonMarker +
      `\n\n[QUICK_REPLY:publicar,editar_comentario]`;
    console.log("[ai-orchestrator] Service rating: submit preview");
    return { response: createSseResponse(preview, lib.corsHeaders) };
  }

  if (askedRatingSubmitPreview && userPublishes) {
    const accRd = accumulatedFields.rating_dimensions as Record<string, number> | null | undefined;
    let meanForSentiment =
      typeof accumulatedFields.rating_stars === "number" &&
        accumulatedFields.rating_stars >= 1 &&
        accumulatedFields.rating_stars <= 5
        ? accumulatedFields.rating_stars
        : 3;
    if (accRd && lib.isCompleteServiceRatingDimensions(accRd)) {
      meanForSentiment = lib.aggregateRatingDimensionsStars(accRd);
    }
    const sentimentAuto = lib.inferServiceRatingSentimentFromMean(meanForSentiment);
    const toolArgs: Record<string, unknown> = {
      service_type: accumulatedFields.service_type,
      service_name: accumulatedFields.service_name,
      service_neighborhood: accumulatedFields.service_neighborhood,
      service_address_confirmed:
        accumulatedFields.service_address_confirmed || accumulatedFields._address_reconfirmed,
      rating_stars: accumulatedFields.rating_stars,
      rating_dimensions: accumulatedFields.rating_dimensions,
      rating_text: accumulatedFields.rating_text,
      sentiment: sentimentAuto,
    };
    if ("wait_time_score" in accumulatedFields) toolArgs.wait_time_score = accumulatedFields.wait_time_score;
    if ("tempo_espera_score" in accumulatedFields) toolArgs.tempo_espera_score = accumulatedFields.tempo_espera_score;
    if ("atendimento_score" in accumulatedFields) toolArgs.atendimento_score = accumulatedFields.atendimento_score;
    if ("infraestrutura_score" in accumulatedFields) {
      toolArgs.infraestrutura_score = accumulatedFields.infraestrutura_score;
    }
    if ("limpeza_score" in accumulatedFields) toolArgs.limpeza_score = accumulatedFields.limpeza_score;
    if (accumulatedFields.visit_id) {
      toolArgs.visit_id = accumulatedFields.visit_id;
      if (accumulatedFields.service_id) toolArgs.service_id = accumulatedFields.service_id;
      if (accumulatedFields.service_name) toolArgs.service_name = accumulatedFields.service_name;
    } else if (accumulatedFields.service_id) {
      toolArgs.service_id = accumulatedFields.service_id;
    }

    const toolResult = await lib.executeTool(
      "create_service_rating",
      toolArgs,
      userId,
      supabase,
      accumulatedFields,
    ) as ExecuteToolResult;
    return { toolResult };
  }

  return {};
}
