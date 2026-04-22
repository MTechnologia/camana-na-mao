import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildTransportFinalPreviewMessage,
} from "./lib-index-transport-preview.ts";
import {
  buildTransportAccessibilityChecklistRequest,
  buildTransportAttachInstructionMessage,
  buildTransportPhotoChoiceMessage,
  buildTransportProgressContent,
  buildTransportSimilarReportsHint,
  buildTransportStopLocationRequest,
  buildTransportStopNameRequest,
  buildTransportSubcategoryRequest,
  hasTransportAccessibilityDetails,
  maybeCreateSimilarTransportReportsResponse,
} from "./lib-index-transport-shared.ts";
import { createSseResponse } from "./lib-index-sse.ts";

type ExecuteToolResult = {
  success: boolean;
  message: string;
};

type TransportAutoArgs = {
  accumulatedFields: Record<string, unknown>;
  attachmentUrls: string[];
  chatMessages: Array<Record<string, unknown>>;
  conversationId?: string;
  getMessageText: (m: Record<string, unknown>) => string;
  lastAssistantLower: string;
  lastAssistantMessage: string;
  lastUserMessage: string;
  msgLower: string;
  supabase: SupabaseClient;
  userId: string;
  lib: typeof import("./lib.ts");
};

type TransportAutoResult = {
  response?: Response;
  toolResult?: ExecuteToolResult;
};

function buildTransportToolArgs(accumulatedFields: Record<string, unknown>): Record<string, unknown> {
  return {
    description: accumulatedFields.description,
    report_type: accumulatedFields.report_type,
    sub_category: accumulatedFields.sub_category,
    line_code: accumulatedFields.line_code,
    line_id: accumulatedFields.line_id,
    occurrence_date: accumulatedFields.occurrence_date,
    occurrence_time: accumulatedFields.occurrence_time,
    direction: accumulatedFields.direction,
    recurrence_frequency: accumulatedFields.recurrence_frequency,
    location: accumulatedFields.location,
    stop_name: accumulatedFields.stop_name,
    stop_location: accumulatedFields.stop_location,
    accessibility_details: accumulatedFields.accessibility_details,
    severity: accumulatedFields.severity,
    impact_description: accumulatedFields.impact_description,
    subcategory_label: accumulatedFields.subcategory_label,
    personal_impact: accumulatedFields.personal_impact,
  };
}

export async function handleDeterministicTransportAutoCreate(
  args: TransportAutoArgs,
): Promise<TransportAutoResult> {
  const {
    accumulatedFields,
    attachmentUrls,
    chatMessages,
    conversationId,
    getMessageText,
    lastAssistantLower,
    lastAssistantMessage,
    lastUserMessage,
    msgLower,
    supabase,
    userId,
    lib,
  } = args;

  const accRt = String(accumulatedFields.report_type || "outro").toLowerCase();
  const accSub =
    accumulatedFields.sub_category != null && String(accumulatedFields.sub_category).trim() !== ""
      ? String(accumulatedFields.sub_category).trim()
      : "";
  if (!accSub || !lib.isValidTransportSubcategory(accRt, accSub)) {
    return {
      response: createSseResponse(
        buildTransportSubcategoryRequest(accumulatedFields, accRt),
        lib.corsHeaders,
      ),
    };
  }
  if (!accumulatedFields.occurrence_time) {
    return {
      response: createSseResponse(
        buildTransportProgressContent(
          accumulatedFields,
          "[FIELD_REQUEST:occurrence_time]Qual foi o **horário exato** da ocorrência?[TIME_PICKER]",
        ),
        lib.corsHeaders,
      ),
    };
  }
  if (!accumulatedFields.direction) {
    return {
      response: createSseResponse(
        buildTransportProgressContent(
          accumulatedFields,
          "[FIELD_REQUEST:direction]Qual era o **sentido** da viagem?[DIRECTION_PICKER]",
        ),
        lib.corsHeaders,
      ),
    };
  }
  if (!accumulatedFields.recurrence_frequency) {
    return {
      response: createSseResponse(
        buildTransportProgressContent(
          accumulatedFields,
          "[FIELD_REQUEST:recurrence_frequency]Com qual frequência isso acontece?[RECURRENCE_FREQUENCY_PICKER]",
        ),
        lib.corsHeaders,
      ),
    };
  }
  if (accumulatedFields.personal_impact == null || accumulatedFields.personal_impact === "") {
    return {
      response: createSseResponse(
        buildTransportProgressContent(
          accumulatedFields,
          "[FIELD_REQUEST:personal_impact]Como isso afetou **sua rotina**?[IMPACT_PICKER]",
        ),
        lib.corsHeaders,
      ),
    };
  }

  if (!accumulatedFields.stop_name) {
    return {
      response: createSseResponse(buildTransportStopNameRequest(accumulatedFields), lib.corsHeaders),
    };
  }

  if (!accumulatedFields.stop_location) {
    return {
      response: createSseResponse(buildTransportStopLocationRequest(accumulatedFields), lib.corsHeaders),
    };
  }

  if (
    accRt === "acessibilidade" &&
    !hasTransportAccessibilityDetails(accumulatedFields.accessibility_details)
  ) {
    return {
      response: createSseResponse(buildTransportAccessibilityChecklistRequest(accumulatedFields), lib.corsHeaders),
    };
  }

  const userWantsCorrectionTransport = /^(corrigir|corrigir\s+relato|editar|ajustar)$/i.test(msgLower.trim());
  const isTransportFinalPreview =
    /resumo\s+do\s+relato\s+de\s+transporte/i.test(lastAssistantLower) &&
    !/deseja\s+anexar\s+imagens/i.test(lastAssistantLower);
  const showedPreviewAfterAttach =
    /resumo\s+do\s+relato\s+de\s+transporte[\s\S]*se\s+estiver\s+tudo\s+certo[\s\S]*(?:registrar\s+para\s+finalizar|confirmar)/i
      .test(lastAssistantLower || "");
  const transportFieldReqMatch = lastAssistantMessage.match(/\[FIELD_REQUEST:(\w+)\]/);
  const prevWasTransportFieldRequest =
    /\[COLLECTION_PROGRESS:transport_report:/i.test(lastAssistantMessage) && !!transportFieldReqMatch;

  const lastAssistantPlain = lastAssistantLower.replace(/\*/g, "");
  const askedTransportCorrectionMenu =
    /o que voc[eê] gostaria de ajustar/i.test(lastAssistantPlain) &&
    /\[QUICK_REPLY:[^\]]*descri/i.test(lastAssistantMessage);

  const transportCorrectionMenuPick = msgLower.trim().toLowerCase();
  const transportPickNorm = transportCorrectionMenuPick
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/g, "c");

  if (askedTransportCorrectionMenu) {
    const progress = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]`;
    let reply = "";
    if (transportPickNorm === "descricao" || /^descri/.test(transportPickNorm)) {
      reply =
        `${progress}[FIELD_REQUEST:description]Qual é a **descrição correta**? Reescreva o que aconteceu com mais detalhes.`;
    } else if (transportPickNorm === "tipo") {
      reply =
        `${progress}[FIELD_REQUEST:report_type]Qual o **tipo de problema** correto?[QUICK_REPLY:atraso,lotacao,seguranca,acessibilidade,limpeza,conducao,outro]`;
    } else if (transportPickNorm === "linha") {
      reply = `${progress}[FIELD_REQUEST:line_code]Qual a **linha ou estação** correta?[LINE_PICKER]`;
    } else if (transportPickNorm === "data") {
      reply = `${progress}[FIELD_REQUEST:occurrence_date]Qual a **data correta** da ocorrência?[DATE_PICKER]`;
    } else if (transportPickNorm === "horario") {
      reply = `${progress}[FIELD_REQUEST:occurrence_time]Qual o **horário correto** da ocorrência?[TIME_PICKER]`;
    } else if (transportPickNorm === "sentido") {
      reply = `${progress}[FIELD_REQUEST:direction]Qual o **sentido** correto da viagem?[DIRECTION_PICKER]`;
    } else if (transportPickNorm === "frequencia") {
      reply =
        `${progress}[FIELD_REQUEST:recurrence_frequency]Qual a **frequência** correta?[RECURRENCE_FREQUENCY_PICKER]`;
    } else if (transportPickNorm === "impacto") {
      reply = `${progress}[FIELD_REQUEST:personal_impact]Como isso afetou **sua rotina**? Escolha de novo.[IMPACT_PICKER]`;
    } else if (transportPickNorm === "parada") {
      reply = `${progress}[FIELD_REQUEST:stop_name]Qual foi a **parada, ponto, terminal ou estação** corretos?`;
    } else if (
      transportPickNorm === "ponto" ||
      transportPickNorm === "referencia" ||
      transportPickNorm === "endereco"
    ) {
      reply =
        `${progress}[FIELD_REQUEST:stop_location]Qual o **endereço, cruzamento ou referência** corretos desse ponto?`;
    } else if (transportPickNorm === "detalhes_acessibilidade") {
      reply =
        `${progress}[FIELD_REQUEST:accessibility_details]Atualize o **checklist de acessibilidade** abaixo.[ACCESSIBILITY_CHECKLIST]`;
    } else if (transportPickNorm === "local") {
      reply = `${progress}[FIELD_REQUEST:location]Qual o **local** ou ponto de referência correto? (parada, terminal, trecho)`;
    }
    if (reply) {
      console.log("[ai-orchestrator] Transport report: correction menu pick → field request");
      return { response: createSseResponse(reply, lib.corsHeaders) };
    }
    const reaskMenu =
      `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]Não reconheci essa opção. **O que você gostaria de ajustar** no resumo?\n\n` +
      `Selecione uma opção abaixo.[QUICK_REPLY:descrição,tipo,linha,data,horário,sentido,frequência,impacto,parada,ponto,detalhes_acessibilidade,local]`;
    console.log("[ai-orchestrator] Transport report: correction menu — pick não reconhecido, reexibindo opções");
    return { response: createSseResponse(reaskMenu, lib.corsHeaders) };
  }

  const threadHadTransportPreviewOrCorrection = chatMessages.some((m: Record<string, unknown>) => {
    if (m.role !== "assistant") return false;
    const t = getMessageText(m).toLowerCase();
    return (
      /resumo\s+do\s+relato\s+de\s+transporte/i.test(t) ||
      /o\s+que\s+voc[eê]\s+gostaria\s+de\s+ajustar/i.test(t)
    );
  });

  if (
    prevWasTransportFieldRequest &&
    lastUserMessage.trim().length > 0 &&
    threadHadTransportPreviewOrCorrection
  ) {
    const menuTokens = new Set([
      "descrição",
      "descricao",
      "tipo",
      "linha",
      "data",
      "horário",
      "horario",
      "sentido",
      "frequência",
      "frequencia",
      "impacto",
      "parada",
      "ponto",
      "referencia",
      "endereco",
      "detalhes_acessibilidade",
      "local",
    ]);
    const isMenuPick = menuTokens.has(transportCorrectionMenuPick);
    if (
      /^(confirmar|registrar|sim|ok|tudo\s+certo)$/i.test(msgLower.trim()) ||
      (!isMenuPick && !/^(corrigir|editar|ajustar)$/i.test(msgLower.trim()))
    ) {
      const photoLine =
        attachmentUrls.length > 0
          ? `\n• **Fotos anexadas:** ${attachmentUrls.length} imagem(ns)`
          : "";
      const previewBody = buildTransportFinalPreviewMessage(
        accumulatedFields as Record<string, unknown>,
        photoLine,
        lib.formatTransportPreviewTypeLine(accumulatedFields as Record<string, unknown>),
      );
      const preview = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]${previewBody}`;
      console.log("[ai-orchestrator] Transport report: after field correction → showing preview again");
      return { response: createSseResponse(preview, lib.corsHeaders) };
    }
  }

  if (isTransportFinalPreview && userWantsCorrectionTransport) {
    const correctionOptions =
      `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]Certo. O que você gostaria de **ajustar** no resumo?\n\n` +
      `Selecione uma opção abaixo.[QUICK_REPLY:descrição,tipo,linha,data,horário,sentido,frequência,impacto,parada,ponto,detalhes_acessibilidade,local]`;
    console.log("[ai-orchestrator] Transport report: user requested correction → menu");
    return { response: createSseResponse(correctionOptions, lib.corsHeaders) };
  }

  const askedPhotoChoice = /deseja\s+anexar\s+imagens|quer\s+anexar\s+fotos/i.test(lastAssistantLower);
  const askedToAttach =
    /pode\s+anexar\s+at[eé]\s*3\s+fotos|quando\s+terminar.*registrar|envie\s+\*?registrar\*?/i.test(
      lastAssistantLower,
    );
  const userSaidNo = /^(n[aã]o|nao|no|n[aã]o\s+quero|n[aã]o\s+desejo)$/i.test(msgLower);
  const userConfirms = /^(sim|confirmar|registrar|ok|tudo\s+certo)$/i.test(msgLower);

  const showedSimilarTransport =
    /\[SIMILAR_TRANSPORT_REPORTS_B64:/i.test(lastAssistantLower) ||
    /relatos\s+recentes\s+na\s+mesma\s+linha/i.test(lastAssistantLower);
  const userWantsNewAfterSimilarTransport =
    /^(novo_relato|novo\s+relato|registrar\s+novo|criar\s+novo|mesmo\s+assim)\b/i.test(msgLower.trim());

  const looksLikeTransportCorrectionMenuUi =
    /selecione\s+uma\s+op[cç][aã]o\s+abaixo/i.test(lastAssistantLower) &&
    /\[QUICK_REPLY:[^\]]*descri/i.test(lastAssistantMessage) &&
    /gostaria\s+de\s+ajustar|ajustar\s+no\s+resumo/i.test(lastAssistantPlain);

  if (!askedPhotoChoice && !askedToAttach && !isTransportFinalPreview && !looksLikeTransportCorrectionMenuUi) {
    if (showedSimilarTransport && userWantsNewAfterSimilarTransport) {
      console.log("[ai-orchestrator] Transport report: similar list acknowledged → asking photo choice");
      return { response: createSseResponse(buildTransportPhotoChoiceMessage(accumulatedFields), lib.corsHeaders) };
    }
    if (
      showedSimilarTransport &&
      !userWantsNewAfterSimilarTransport &&
      lastUserMessage.trim().length > 0
    ) {
      return { response: createSseResponse(buildTransportSimilarReportsHint(accumulatedFields), lib.corsHeaders) };
    }
    if (!showedSimilarTransport) {
      const similarResponse = await maybeCreateSimilarTransportReportsResponse({
        accumulatedFields,
        corsHeaders: lib.corsHeaders,
        logContext: "[ai-orchestrator] Transport report: showing similar reports, count:",
        supabase,
        userId,
        lib,
      });
      if (similarResponse) {
        return { response: similarResponse };
      }
    }
    console.log("[ai-orchestrator] Transport report: asking photo choice");
    return { response: createSseResponse(buildTransportPhotoChoiceMessage(accumulatedFields), lib.corsHeaders) };
  }

  if (askedPhotoChoice && !userSaidNo) {
    console.log("[ai-orchestrator] Transport report: user said yes → showing attach instructions");
    return { response: createSseResponse(buildTransportAttachInstructionMessage(accumulatedFields), lib.corsHeaders) };
  }
  if (askedPhotoChoice && userSaidNo) {
    const previewBody = buildTransportFinalPreviewMessage(
      accumulatedFields as Record<string, unknown>,
      "",
      lib.formatTransportPreviewTypeLine(accumulatedFields as Record<string, unknown>),
    );
    const preview = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]${previewBody}`;
    console.log("[ai-orchestrator] Transport report: user said no to photos, showing preview");
    return { response: createSseResponse(preview, lib.corsHeaders) };
  }

  if (askedToAttach && userConfirms && !showedPreviewAfterAttach) {
    const photoLine =
      attachmentUrls.length > 0
        ? `\n• **Fotos anexadas:** ${attachmentUrls.length} imagem(ns)`
        : "";
    const previewBody = buildTransportFinalPreviewMessage(
      accumulatedFields as Record<string, unknown>,
      photoLine,
      lib.formatTransportPreviewTypeLine(accumulatedFields as Record<string, unknown>),
    );
    const preview = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]${previewBody}`;
    console.log("[ai-orchestrator] Transport report: showing preview before create (first Registrar)");
    return { response: createSseResponse(preview, lib.corsHeaders) };
  }

  if (userConfirms && (showedPreviewAfterAttach || (isTransportFinalPreview && !askedToAttach))) {
    let photosToSave = attachmentUrls;
    if (photosToSave.length === 0 && conversationId) {
      try {
        const { data: conv } = await supabase.from("ai_conversations").select("messages").eq("id", conversationId)
          .single();
        const convMessages = (conv?.messages as Array<Record<string, unknown>>) || [];
        const lastWithPhotos = [...convMessages].filter((m: Record<string, unknown>) => m.role === "user").reverse()
          .find((m: Record<string, unknown>) => Array.isArray(m.attachmentUrls) && m.attachmentUrls.length > 0);
        if (lastWithPhotos?.attachmentUrls) {
          photosToSave = lastWithPhotos.attachmentUrls as string[];
          console.log("[ai-orchestrator] Transport report: got attachmentUrls from conversation, count:", photosToSave.length);
        }
      } catch (e) {
        console.warn("[ai-orchestrator] Fallback load conversation for transport photos failed:", e);
      }
    }
    const toolArgs = buildTransportToolArgs(accumulatedFields);
    if (photosToSave.length > 0) {
      toolArgs.photos = photosToSave;
    }
    const toolResult = await lib.executeTool(
      "create_transport_report",
      toolArgs,
      userId,
      supabase,
      accumulatedFields,
    ) as ExecuteToolResult;
    return { toolResult };
  }
  if (askedToAttach && !userConfirms) {
    const photoLine =
      attachmentUrls.length > 0
        ? `\n• **Fotos anexadas:** ${attachmentUrls.length} imagem(ns)`
        : "";
    const previewBody = buildTransportFinalPreviewMessage(
      accumulatedFields as Record<string, unknown>,
      photoLine,
      lib.formatTransportPreviewTypeLine(accumulatedFields as Record<string, unknown>),
    );
    const preview = `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]${previewBody}`;
    console.log(
      "[ai-orchestrator] Transport report: user sent Registrar (attach flow), showing preview, attachmentUrls:",
      attachmentUrls.length,
    );
    return { response: createSseResponse(preview, lib.corsHeaders) };
  }

  const toolResult = await lib.executeTool(
    "create_transport_report",
    buildTransportToolArgs(accumulatedFields),
    userId,
    supabase,
    accumulatedFields,
  ) as ExecuteToolResult;
  return { toolResult };
}
