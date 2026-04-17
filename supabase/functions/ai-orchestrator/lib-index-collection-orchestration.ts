import type { SupabaseClient } from "@supabase/supabase-js";

import type { CollectionIntent } from "./lib.ts";
import { handleDeterministicServiceRatingAutoCreate } from "./lib-index-service-rating-auto.ts";
import { handleDeterministicTransportAutoCreate } from "./lib-index-transport-auto.ts";
import { handleDeterministicUrbanAutoCreate } from "./lib-index-urban-auto.ts";
import { createSseResponse } from "./lib-index-sse.ts";
import { getNextMissingField } from "./lib-next-missing-field.ts";

type NextFieldInfo = { field: string | null; picker: string | null; prompt: string | null };

type CollectionOrchestrationArgs = {
  accumulatedFields: Record<string, unknown>;
  attachmentUrls: string[];
  chatMessages: Array<Record<string, unknown>>;
  collectionIntent: CollectionIntent | null;
  conversationId: unknown;
  dynamicSystemPrompt: string;
  getMessageText: (message: Record<string, unknown>) => string;
  lastAssistantLower: string;
  lastAssistantMessage: string;
  lastUserMessage: string;
  lightJourneyMarker: string;
  msgLower: string;
  requestStartTime: number;
  supabase: SupabaseClient;
  supabaseClassificationFeedbackRead: SupabaseClient | null;
  userId: string;
  lib: typeof import("./lib.ts");
  deps?: {
    getNextMissingField?: typeof getNextMissingField;
    handleDeterministicServiceRatingAutoCreate?: typeof handleDeterministicServiceRatingAutoCreate;
    handleDeterministicTransportAutoCreate?: typeof handleDeterministicTransportAutoCreate;
    handleDeterministicUrbanAutoCreate?: typeof handleDeterministicUrbanAutoCreate;
  };
};

type CollectionOrchestrationResult = {
  dynamicSystemPrompt: string;
  nextFieldInfo: NextFieldInfo;
  response?: Response;
};

type ExecuteToolResult = {
  success: boolean;
  message: string;
};

export async function orchestrateCollectionTurn(
  args: CollectionOrchestrationArgs,
): Promise<CollectionOrchestrationResult> {
  const {
    accumulatedFields,
    attachmentUrls,
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
    userId,
    lib,
    deps,
  } = args;

  const getNextMissingFieldImpl = deps?.getNextMissingField ?? getNextMissingField;
  const handleUrbanAutoImpl = deps?.handleDeterministicUrbanAutoCreate ?? handleDeterministicUrbanAutoCreate;
  const handleTransportAutoImpl =
    deps?.handleDeterministicTransportAutoCreate ?? handleDeterministicTransportAutoCreate;
  const handleServiceRatingAutoImpl =
    deps?.handleDeterministicServiceRatingAutoCreate ?? handleDeterministicServiceRatingAutoCreate;

  let finalDynamicSystemPrompt = dynamicSystemPrompt;
  let nextFieldInfo: NextFieldInfo = { field: null, picker: null, prompt: null };

  if (collectionIntent && ["urban_report", "transport_report", "service_rating", "services"].includes(collectionIntent.type)) {
    nextFieldInfo = await getNextMissingFieldImpl(
      collectionIntent.type,
      accumulatedFields,
      supabase,
      supabaseClassificationFeedbackRead ?? supabase,
      userId,
      lib,
    );
    console.log("[ai-orchestrator] Deterministic next field:", nextFieldInfo.field);

    if (!nextFieldInfo.field && accumulatedFields) {
      console.log("[ai-orchestrator] All fields collected, auto-calling create function for:", collectionIntent.type);

      let toolResult: ExecuteToolResult | undefined;
      try {
        if (collectionIntent.type === "urban_report") {
          const urbanAutoResult = await handleUrbanAutoImpl({
            accumulatedFields,
            attachmentUrls,
            conversationId: typeof conversationId === "string" ? conversationId : undefined,
            lastAssistantLower,
            lastAssistantMessage,
            lastUserMessage,
            msgLower,
            supabase,
            userId,
            lib,
          });
          if (urbanAutoResult.response) {
            return { dynamicSystemPrompt: finalDynamicSystemPrompt, nextFieldInfo, response: urbanAutoResult.response };
          }
          toolResult = urbanAutoResult.toolResult as ExecuteToolResult | undefined;
        } else if (collectionIntent.type === "transport_report") {
          const transportAutoResult = await handleTransportAutoImpl({
            accumulatedFields,
            attachmentUrls,
            chatMessages,
            conversationId: typeof conversationId === "string" ? conversationId : undefined,
            getMessageText,
            lastAssistantLower,
            lastAssistantMessage,
            lastUserMessage,
            msgLower,
            supabase,
            userId,
            lib,
          });
          if (transportAutoResult.response) {
            return {
              dynamicSystemPrompt: finalDynamicSystemPrompt,
              nextFieldInfo,
              response: transportAutoResult.response,
            };
          }
          toolResult = transportAutoResult.toolResult as ExecuteToolResult | undefined;
        } else if (collectionIntent.type === "service_rating") {
          const serviceRatingAutoResult = await handleServiceRatingAutoImpl({
            accumulatedFields,
            lastAssistantMessage,
            lightJourneyMarker,
            msgLower,
            supabase,
            userId,
            lib,
          });
          if (serviceRatingAutoResult.response) {
            return {
              dynamicSystemPrompt: finalDynamicSystemPrompt,
              nextFieldInfo,
              response: serviceRatingAutoResult.response,
            };
          }
          toolResult = serviceRatingAutoResult.toolResult as ExecuteToolResult | undefined;
        }

        if (toolResult?.success) {
          let responseContent = toolResult.message;
          if (lightJourneyMarker && !responseContent.includes("[LIGHT_JOURNEY:")) {
            responseContent = lightJourneyMarker + responseContent;
          }
          if (!responseContent.includes("[COLLECTION_PROGRESS:")) {
            responseContent = `[COLLECTION_PROGRESS:${collectionIntent.type}:{}]${responseContent}`;
          }
          console.log("[ai-orchestrator] Request completed in", Date.now() - requestStartTime, "ms (auto-create)");
          return {
            dynamicSystemPrompt: finalDynamicSystemPrompt,
            nextFieldInfo,
            response: createSseResponse(responseContent, lib.corsHeaders),
          };
        }

        if (toolResult && !toolResult.success) {
          const failMsg = toolResult.message || "";
          const needsFieldFromTool = failMsg.includes("[FIELD_REQUEST:");
          if (collectionIntent.type === "service_rating" && !needsFieldFromTool) {
            let responseContent = failMsg;
            if (lightJourneyMarker && !responseContent.includes("[LIGHT_JOURNEY:")) {
              responseContent = lightJourneyMarker + responseContent;
            }
            if (!responseContent.includes("[COLLECTION_PROGRESS:")) {
              responseContent = `[COLLECTION_PROGRESS:${collectionIntent.type}:{}]${responseContent}`;
            }
            console.log(
              "[ai-orchestrator] Auto-create service_rating terminal failure, returning tool message directly",
            );
            return {
              dynamicSystemPrompt: finalDynamicSystemPrompt,
              nextFieldInfo,
              response: createSseResponse(responseContent, lib.corsHeaders),
            };
          }

          console.log("[ai-orchestrator] Auto-create validation failed, continuing to LLM:", toolResult.message);
          nextFieldInfo = { field: null, picker: null, prompt: toolResult.message };
        }
      } catch (error) {
        console.error("[ai-orchestrator] Auto-create error:", error);
      }
    }
  }

  if (collectionIntent && Object.keys(accumulatedFields).length > 0) {
    const fieldsList = Object.entries(accumulatedFields)
      .filter(([_, value]) => value && (typeof value === "string" ? value.length > 0 : true))
      .map(([key, value]) => `• ${key}: ${String(value).substring(0, 100)}`)
      .join("\n");

    const description = String(accumulatedFields.description ?? "");
    const descLower = description.toLowerCase();
    const lastUserUrgent =
      /(incêndio|incendio|fogo|queimando|chamas|armado|arma|armas|drogas?|tráfico|trafico|violência|violencia|agressão|agressao|baderna|funkeiros?|perigo|risco iminente)/i
        .test(msgLower);
    const hasUrgentContent =
      /(armado|arma|armas|drogas?|tráfico|trafico|violência|violencia|agressão|agressao|baderna|funkeiros?|perigo|risco iminente|incêndio|incendio|fogo|queimando|chamas)/i
        .test(descLower) || lastUserUrgent;
    const empathyNote = hasUrgentContent
      ? "\n\n⚠️ **ATENÇÃO - CONTEÚDO URGENTE / GRAVE:**\nReconheça a gravidade com empatia e eficiência.\n" +
        '**Localização:** NUNCA peça só "digite o CEP". O próximo passo correto é **location_method** com opções GPS / endereço cadastrado / CEP (o app mostra botões quando o backend envia `[LOCATION_METHOD_PICKER]`).\n' +
        "NÃO pergunte de novo por dados já listados em \"Campos JÁ COLETADOS\".\n"
      : "";

    const collectionContext = `

=== CONTEXTO ATUAL DA COLETA ===

**Jornada ativa:** ${collectionIntent.type}
**Campos JÁ COLETADOS (NÃO PERGUNTAR NOVAMENTE):**
${fieldsList}
${nextFieldInfo.field ? `\n**PRÓXIMO CAMPO A PEDIR:** ${nextFieldInfo.field}\n**PERGUNTA SUGERIDA:** ${nextFieldInfo.prompt || ""}` : "\n**STATUS:** Todos os campos obrigatórios foram coletados. Chame a ferramenta de criação para finalizar."}
${empathyNote}
**REGRAS CRÍTICAS:**
1. NUNCA pergunte por campos já listados acima (cep, street, neighborhood, category, line_code, etc.)
2. Se o usuário já deu CEP, rua e bairro estão resolvidos via auto-lookup - NÃO peça novamente
3. Se o usuário deu rua E bairro manualmente, localização está completa - NÃO peça CEP
4. Pergunte APENAS o próximo campo listado acima
5. Seja DIRETO: uma pergunta curta por mensagem
6. Se a descrição já contém detalhes suficientes, NÃO pergunte "qual tipo de problema" - classifique automaticamente
===`;

    finalDynamicSystemPrompt = lib.systemPrompt + "\n\n" + collectionContext;
    console.log(
      "[ai-orchestrator] Injected collection context. Next field:",
      nextFieldInfo.field,
      hasUrgentContent ? "(URGENT CONTENT DETECTED)" : "",
    );
  }

  return {
    dynamicSystemPrompt: finalDynamicSystemPrompt,
    nextFieldInfo,
  };
}
