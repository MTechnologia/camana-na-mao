import type { SupabaseClient } from "@supabase/supabase-js";

import { createSseResponse } from "./lib-index-sse.ts";

type ExecuteToolResult = {
  success: boolean;
  message: string;
};

type UrbanAutoArgs = {
  accumulatedFields: Record<string, unknown>;
  attachmentUrls: string[];
  conversationId?: string;
  lastAssistantLower: string;
  lastAssistantMessage: string;
  lastUserMessage: string;
  msgLower: string;
  supabase: SupabaseClient;
  userId: string;
  lib: typeof import("./lib.ts");
};

type UrbanAutoResult = {
  response?: Response;
  toolResult?: ExecuteToolResult;
};

function buildUrbanProgressContent(accumulatedFields: Record<string, unknown>, content: string): string {
  return `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(accumulatedFields)}]${content}`;
}

function buildUrbanCategoryLabel(category: string): string {
  const catLabels: Record<string, string> = {
    iluminacao: "Iluminação",
    via_publica: "Via Pública",
    pavimentacao: "Pavimentação",
    calcada: "Calçada",
    lixo: "Lixo/Entulho",
    sinalizacao: "Sinalização",
    drenagem: "Drenagem",
    esgoto: "Esgoto/Bueiro",
    area_verde: "Área Verde",
    higiene_urbana: "Higiene Urbana",
    animais: "Animais",
    poluicao: "Poluição",
    feedback_camara: "Feedback Câmara",
    outro: "Outro",
  };
  return catLabels[category] || category;
}

function buildUrbanPreview(
  accumulatedFields: Record<string, unknown>,
  lib: typeof import("./lib.ts"),
  photoLine = "",
): string {
  const cat = String(accumulatedFields.category || "");
  const catLabel = buildUrbanCategoryLabel(cat);
  const natureK = String(accumulatedFields.report_nature || "reclamacao");
  const natureLabel = lib.REPORT_NATURE_LABELS[natureK as keyof typeof lib.REPORT_NATURE_LABELS] || natureK;
  const addr = [accumulatedFields.street, accumulatedFields.street_number, accumulatedFields.reference_point]
    .filter(Boolean)
    .join(", ");
  const neighborhood = accumulatedFields.neighborhood ? ` - ${accumulatedFields.neighborhood}` : "";

  return buildUrbanProgressContent(
    accumulatedFields,
    `**Resumo do relato**

• **Natureza:** ${natureLabel}
• **Categoria:** ${catLabel}${lib.formatUrbanReportPreviewAfterCategory(accumulatedFields as Record<string, unknown>)}
• **Descrição:** ${(accumulatedFields.description || "").toString().slice(0, 200)}${
      (accumulatedFields.description || "").toString().length > 200 ? "..." : ""
    }${lib.formatUrbanReportPreviewAfterDescription(accumulatedFields as Record<string, unknown>)}
• **Endereço:** ${addr}${neighborhood}${photoLine}

Se estiver tudo certo, clique em **Confirmar** para registrar ou em **Corrigir** para alterar algo.[QUICK_REPLY:confirmar,corrigir]`,
  );
}

export async function handleDeterministicUrbanAutoCreate(
  args: UrbanAutoArgs,
): Promise<UrbanAutoResult> {
  const {
    accumulatedFields,
    attachmentUrls,
    conversationId,
    lastAssistantLower,
    lastAssistantMessage,
    lastUserMessage,
    msgLower,
    supabase,
    userId,
    lib,
  } = args;

  const lastOfferedCorrectionOptions =
    /Selecione uma opção abaixo/i.test(lastAssistantLower) &&
    /\[QUICK_REPLY:.*gravidade/i.test(lastAssistantMessage);
  const userPickedGravidadeCorrection = /^(gravidade|gravidad)$/i.test(msgLower.trim());
  if (lastOfferedCorrectionOptions && userPickedGravidadeCorrection) {
    const riskAsk = buildUrbanProgressContent(
      accumulatedFields,
      "[FIELD_REQUEST:risk_level]Qual o **nível de gravidade** correto para este relato?[QUICK_REPLY:critical,moderate,low,none]",
    );
    console.log("[ai-orchestrator] Urban report: correction → gravidade com botões");
    return { response: createSseResponse(riskAsk, lib.corsHeaders) };
  }

  const askedPhotoChoice = /deseja\s+anexar\s+imagens|quer\s+anexar\s+fotos/i.test(lastAssistantLower);
  const askedToAttach =
    /pode\s+anexar\s+at[eé]\s*3\s+fotos|quando\s+terminar.*continuar|envie\s+\*?continuar\*?/i.test(
      lastAssistantLower,
    );
  const showedPreview = /resumo\s+do\s+relato|se\s+estiver\s+tudo\s+certo|confirmar\s+e\s+registrar/i.test(
    lastAssistantLower,
  );
  const userSaidNo = /^(n[aã]o|nao|no|n[aã]o\s+quero|n[aã]o\s+desejo)$/i.test(msgLower);
  const userConfirms = /^(sim|confirmar|registrar|ok|tudo\s+certo)$/i.test(msgLower);
  const userWantsCorrection = /^(corrigir|corrigir\s+relato|editar|ajustar)$/i.test(msgLower.trim());

  const showedSimilarReports =
    /\[SIMILAR_URBAN_REPORTS_B64:/i.test(lastAssistantLower) ||
    /relatos\s+na\s+mesma\s+categoria/i.test(lastAssistantLower);
  const userWantsNewAfterSimilar =
    /^(novo_relato|novo\s+relato|registrar\s+novo|criar\s+novo|mesmo\s+assim)\b/i.test(msgLower.trim());
  const askedCorrectionField =
    /qual\s+campo\s+voc[eê]\s+gostaria\s+de\s+corrigir|voc[eê]\s+pode\s+me\s+dizer,\s*por\s+exemplo/i.test(
      lastAssistantLower,
    );
  const userSentCorrectionLikeText =
    /\b(n[aã]o\s+[ée]|n[aã]o\s+est[aá]|est[aá]\s+errad|corrig|deveria\s+ser)\b/i.test(msgLower);

  if (
    showedSimilarReports &&
    userWantsNewAfterSimilar &&
    !askedPhotoChoice &&
    !askedToAttach &&
    !showedPreview
  ) {
    const photoChoiceMsg = buildUrbanProgressContent(
      accumulatedFields,
      "Ótimo, já tenho todas as informações. **Você deseja anexar imagens ao seu relato?**[QUICK_REPLY:sim,não]",
    );
    console.log("[ai-orchestrator] Urban report: similar reports acknowledged → asking photo choice");
    return { response: createSseResponse(photoChoiceMsg, lib.corsHeaders) };
  }

  if (!askedPhotoChoice && !askedToAttach && !showedPreview && !showedSimilarReports) {
    if (askedCorrectionField || userSentCorrectionLikeText) {
      const preview = buildUrbanPreview(accumulatedFields, lib);
      console.log(
        "[ai-orchestrator] Urban report: correction context detected → skipping similar list and showing updated preview",
      );
      return { response: createSseResponse(preview, lib.corsHeaders) };
    }

    const cat = String(accumulatedFields.category || "");
    if (cat && cat !== "feedback_camara") {
      try {
        const coords = await lib.resolveUrbanCoordsForSimilarSearch(supabase, accumulatedFields);
        if (coords) {
          const near = await lib.fetchNearestUrbanReportsForSimilarity(
            supabase,
            coords.lat,
            coords.lon,
            cat,
            userId,
            10,
          );
          if (near.length > 0) {
            const payload = { reports: near, center: coords };
            const json = JSON.stringify(payload);
            const b64 = btoa(unescape(encodeURIComponent(json)));
            const intro =
              `Encontramos **relatos na mesma categoria** próximos do local informado, **do mais próximo ao mais distante** (até ${near.length} registros). Você pode **apoiar** um relato existente ou **registrar um novo**.`;
            const similarMsg = buildUrbanProgressContent(
              accumulatedFields,
              `${intro}\n\n[SIMILAR_URBAN_REPORTS_B64:${b64}]\n\nToque em **Registrar novo relato** para seguir com o seu pedido (fotos e confirmação).[QUICK_REPLY:novo_relato]`,
            );
            console.log("[ai-orchestrator] Urban report: showing nearest similar reports, count:", near.length);
            return { response: createSseResponse(similarMsg, lib.corsHeaders) };
          }
        }
      } catch (e) {
        console.warn("[ai-orchestrator] Urban similar reports lookup failed:", e);
      }
    }

    const photoChoiceMsg = buildUrbanProgressContent(
      accumulatedFields,
      "Ótimo, já tenho todas as informações. **Você deseja anexar imagens ao seu relato?**[QUICK_REPLY:sim,não]",
    );
    console.log("[ai-orchestrator] Urban report: asking photo choice");
    return { response: createSseResponse(photoChoiceMsg, lib.corsHeaders) };
  }

  if (askedPhotoChoice && !userSaidNo) {
    const attachMsg = buildUrbanProgressContent(
      accumulatedFields,
      "Pode anexar até 3 fotos usando os botões **Câmera** ou **Galeria** abaixo. Quando terminar, clique em **Registrar** para finalizar o relato.[QUICK_REPLY:registrar]",
    );
    console.log("[ai-orchestrator] Urban report: user said yes or unclear → showing attach instructions");
    return { response: createSseResponse(attachMsg, lib.corsHeaders) };
  }

  if (askedPhotoChoice && userSaidNo) {
    const preview = buildUrbanPreview(accumulatedFields, lib);
    console.log("[ai-orchestrator] Urban report: user said no to photos, showing preview");
    return { response: createSseResponse(preview, lib.corsHeaders) };
  }

  if (showedPreview && userWantsCorrection) {
    const correctionOptions = buildUrbanProgressContent(
      accumulatedFields,
      "Certo. O que você gostaria de corrigir no resumo do relato?\n\nSelecione uma opção abaixo.[QUICK_REPLY:descrição,endereço,categoria,tipo_detalhe,gravidade,tipos_de_risco,afetação,cep,natureza]",
    );
    console.log("[ai-orchestrator] Urban report: user requested correction → showing correction options");
    return { response: createSseResponse(correctionOptions, lib.corsHeaders) };
  }

  if (showedPreview && userConfirms) {
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
          console.log(
            "[ai-orchestrator] Urban report: got attachmentUrls from conversation fallback, count:",
            photosToSave.length,
          );
        }
      } catch (e) {
        console.warn("[ai-orchestrator] Fallback load conversation for photos failed:", e);
      }
    }
    const toolArgs: Record<string, unknown> = {
      category: accumulatedFields.category,
      subcategory: accumulatedFields.subcategory,
      report_nature: accumulatedFields.report_nature,
      description: accumulatedFields.description,
      cep: accumulatedFields.cep,
      street: accumulatedFields.street,
      street_number: accumulatedFields.street_number,
      reference_point: accumulatedFields.reference_point,
      neighborhood: accumulatedFields.neighborhood,
      city: accumulatedFields.city,
      risk_level: accumulatedFields.risk_level,
      risk_types: accumulatedFields.risk_types,
      affected_scope: accumulatedFields.affected_scope,
      affected_estimate: accumulatedFields.affected_estimate,
      active_consequences: accumulatedFields.active_consequences,
      urgency_reason: accumulatedFields.urgency_reason,
      council_member_name: accumulatedFields.council_member_name,
      council_member_party: accumulatedFields.council_member_party,
    };
    if (photosToSave.length > 0) {
      toolArgs.photos = photosToSave;
    }
    const toolResult = await lib.executeTool(
      "create_urban_report",
      toolArgs,
      userId,
      supabase,
      accumulatedFields,
    ) as ExecuteToolResult;
    return { toolResult };
  }

  if (askedToAttach) {
    const photoLine = attachmentUrls.length > 0 ? `\n• **Fotos anexadas:** ${attachmentUrls.length} imagem(ns)\n` : "";
    const preview = buildUrbanPreview(accumulatedFields, lib, photoLine);
    console.log(
      "[ai-orchestrator] Urban report: user sent Continuar (attach flow), showing preview, attachmentUrls count:",
      attachmentUrls.length,
    );
    return { response: createSseResponse(preview, lib.corsHeaders) };
  }

  if (
    showedSimilarReports &&
    !userWantsNewAfterSimilar &&
    !askedPhotoChoice &&
    !askedToAttach &&
    !showedPreview &&
    lastUserMessage.trim().length > 0
  ) {
    const hint = buildUrbanProgressContent(
      accumulatedFields,
      "Para **seguir com um novo relato** (fotos e confirmação), use **Registrar novo relato**. Você pode **apoiar** um dos relatos listados acima.[QUICK_REPLY:novo_relato]",
    );
    return { response: createSseResponse(hint, lib.corsHeaders) };
  }

  return {};
}
