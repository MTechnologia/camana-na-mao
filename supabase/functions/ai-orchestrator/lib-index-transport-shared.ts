import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildTransportPreviewOptionalLines,
  hasTransportAccessibilityDetails,
  transportImpactSummaryLine,
  transportPreviewJsonMarker,
} from "./lib-index-transport-preview.ts";
import { createSseResponse } from "./lib-index-sse.ts";

export function buildTransportProgressContent(
  accumulatedFields: Record<string, unknown>,
  content: string,
): string {
  return `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(accumulatedFields)}]${content}`;
}

export function buildTransportSubcategoryRequest(
  accumulatedFields: Record<string, unknown>,
  reportType: string,
): string {
  return buildTransportProgressContent(
    accumulatedFields,
    `[FIELD_REQUEST:sub_category]Qual detalhe descreve melhor esse problema?[SUBCATEGORY_PICKER:${reportType}]`,
  );
}

export function buildTransportStopNameRequest(accumulatedFields: Record<string, unknown>): string {
  return buildTransportProgressContent(
    accumulatedFields,
    "[FIELD_REQUEST:stop_name]Qual foi a **parada, ponto, terminal ou estação** específicos onde isso aconteceu?",
  );
}

export function buildTransportStopLocationRequest(accumulatedFields: Record<string, unknown>): string {
  return buildTransportProgressContent(
    accumulatedFields,
    "[FIELD_REQUEST:stop_location]Qual o **endereço, cruzamento ou referência** desse ponto? Se preferir, você também pode informar coordenadas `lat,lng`.",
  );
}

export function buildTransportAccessibilityChecklistRequest(
  accumulatedFields: Record<string, unknown>,
): string {
  return buildTransportProgressContent(
    accumulatedFields,
    "[FIELD_REQUEST:accessibility_details]Para detalhar a ocorrência, marque o **checklist de acessibilidade** abaixo (rampa, elevador, piso tátil, apoio para embarque) e complemente se necessário.[ACCESSIBILITY_CHECKLIST]",
  );
}

export function buildTransportPhotoChoiceMessage(accumulatedFields: Record<string, unknown>): string {
  return buildTransportProgressContent(
    accumulatedFields,
    "Ótimo, já tenho todas as informações. **Você deseja anexar imagens quanto ao problema de transporte?**[QUICK_REPLY:sim,não]",
  );
}

export function buildTransportSimilarReportsHint(accumulatedFields: Record<string, unknown>): string {
  return buildTransportProgressContent(
    accumulatedFields,
    "Para **seguir com um novo relato** (fotos e confirmação), use **Registrar novo relato**. Você pode **apoiar** um dos relatos listados acima.[QUICK_REPLY:novo_relato]",
  );
}

export function buildTransportAttachInstructionMessage(accumulatedFields: Record<string, unknown>): string {
  return buildTransportProgressContent(
    accumulatedFields,
    "[PHOTO_ATTACH_STEP][FIELD_REQUEST:photos]Pode anexar até 3 fotos usando os botões **Câmera** ou **Galeria** abaixo. Toque em **Enviar fotos** quando terminar — ou em **Continuar sem foto** para ver o resumo sem anexar.",
  );
}

export function buildTransportInterceptPreview(
  accumulatedFields: Record<string, unknown>,
  lib: typeof import("./lib.ts"),
): string {
  const recurrenceLabelMap: Record<string, string> = {
    primeira_vez: "Primeira vez",
    algumas_vezes_mes: "Algumas vezes/mês",
    toda_semana: "Toda semana",
    todos_os_dias: "Todos os dias",
  };

  return buildTransportProgressContent(
    accumulatedFields,
    `**Resumo do relato de transporte**

• **Problema:** ${((accumulatedFields.description as string) || "").toString().slice(0, 150)}${
      ((accumulatedFields.description as string) || "").toString().length > 150 ? "..." : ""
    }
• **Tipo:** ${lib.formatTransportPreviewTypeLine(accumulatedFields as Record<string, unknown>)}
• **Linha:** ${accumulatedFields.line_code || "Não informada"}
• **Quando:** ${accumulatedFields.occurrence_date || ""}${
      accumulatedFields.occurrence_time ? ` às ${accumulatedFields.occurrence_time}` : ""
    }
• **Sentido:** ${accumulatedFields.direction || "Não informado"}
• **Frequência:** ${
      recurrenceLabelMap[String(accumulatedFields.recurrence_frequency || "")] ||
      accumulatedFields.recurrence_frequency ||
      "Não informada"
    }
• **Impacto na rotina:** ${transportImpactSummaryLine(accumulatedFields.personal_impact)}${
      buildTransportPreviewOptionalLines(accumulatedFields)
    }

Se estiver tudo certo, você pode **anexar fotos** (botões Câmera ou Galeria abaixo) ou registrar direto. **Deseja anexar imagens** quanto ao problema de transporte?${
      transportPreviewJsonMarker(accumulatedFields)
    }[QUICK_REPLY:sim,não]`,
  );
}

export async function maybeCreateSimilarTransportReportsResponse(args: {
  accumulatedFields: Record<string, unknown>;
  corsHeaders: Record<string, string>;
  logContext: string;
  supabase: SupabaseClient;
  userId: string;
  lib: typeof import("./lib.ts");
}): Promise<Response | undefined> {
  const { accumulatedFields, corsHeaders, logContext, supabase, userId, lib } = args;

  try {
    const similar = await lib.fetchSimilarTransportReportsForSupport(
      supabase,
      accumulatedFields as Record<string, unknown>,
      userId,
      10,
    );
    if (similar.length > 0) {
      const payload = { reports: similar };
      const json = JSON.stringify(payload);
      const b64 = btoa(unescape(encodeURIComponent(json)));
      const intro =
        `Encontramos **relatos recentes na mesma linha e tipo de problema** (até ${similar.length} registros). Você pode **apoiar** um relato existente ou **registrar um novo**.`;
      const similarMsg = buildTransportProgressContent(
        accumulatedFields,
        `${intro}\n\n[SIMILAR_TRANSPORT_REPORTS_B64:${b64}]\n\nToque em **Registrar novo relato** para seguir com o seu pedido (fotos e confirmação).[QUICK_REPLY:novo_relato]`,
      );
      console.log(logContext, similar.length);
      return createSseResponse(similarMsg, corsHeaders);
    }
  } catch (e) {
    console.warn(`${logContext} lookup failed:`, e);
  }

  return undefined;
}

export { hasTransportAccessibilityDetails };
