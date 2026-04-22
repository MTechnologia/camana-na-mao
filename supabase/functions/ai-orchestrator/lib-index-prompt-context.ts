import type { SupabaseClient } from "@supabase/supabase-js";

import type { CollectionIntent } from "./lib.ts";
import { createSseResponse } from "./lib-index-sse.ts";

type PromptContextArgs = {
  accumulatedFields: Record<string, unknown>;
  aiChatModel: string;
  collectionIntent: CollectionIntent | null;
  dynamicSystemPrompt: string;
  finalAiApiKey: string;
  finalAiBaseUrl: string;
  lastUserMessage: string;
  lib: typeof import("./lib.ts");
  supabase: SupabaseClient;
  userId: string;
  vertexRagCorpus: string;
  vertexRagDatastore: string;
};

type PromptContextResult = {
  dynamicSystemPrompt: string;
  effectiveTools: unknown;
  shortCircuitResponse?: Response;
};

export async function buildPromptContextAndTools(
  args: PromptContextArgs,
): Promise<PromptContextResult> {
  const {
    accumulatedFields,
    aiChatModel,
    collectionIntent,
    dynamicSystemPrompt: initialSystemPrompt,
    finalAiApiKey,
    finalAiBaseUrl,
    lastUserMessage,
    lib,
    supabase,
    userId,
    vertexRagCorpus,
    vertexRagDatastore,
  } = args;

  let dynamicSystemPrompt = initialSystemPrompt;

  if (collectionIntent?.type === "noticias") {
    try {
      const noticiasContext = await lib.getUltimasNoticias(supabase, 5);
      if (noticiasContext) {
        dynamicSystemPrompt = dynamicSystemPrompt + "\n\n" + noticiasContext;
        console.log("[ai-orchestrator] Injected 5 latest notícias for noticias intent");
      }
    } catch (e) {
      console.warn("[ai-orchestrator] getUltimasNoticias error:", (e as Error).message);
    }
  }

  if (lib.isQuestionAboutProximasOuQuaisAudiencias(lastUserMessage)) {
    try {
      const toolResult = await lib.executeTool(
        "search_audiencias",
        {},
        userId,
        supabase,
        accumulatedFields || {},
      );
      const content = toolResult.message || "";
      const payload = content + "\n\n[APP_ACTIONS:audiencias]";
      console.log(
        '[ai-orchestrator] Short-circuit: search_audiencias for "próximas/quais audiências", length:',
        content.length,
      );
      return {
        dynamicSystemPrompt,
        effectiveTools: lib.tools,
        shortCircuitResponse: createSseResponse(payload, lib.corsHeaders),
      };
    } catch (e) {
      console.error("[ai-orchestrator] Short-circuit search_audiencias error:", e);
    }
  }

  const zoneamentoKeywords = [
    "zoneamento",
    "lpuos",
    "construir",
    "reformar",
    "imóvel",
    "imovel",
    "siszon",
    "legislação urbana",
    "legislacao urbana",
    "smul",
  ];
  const isZoneamentoQuery = zoneamentoKeywords.some((k) => lastUserMessage.toLowerCase().includes(k));
  const isCamaraFuncionamentoQuery = lib.isCamaraFuncionamentoInternoQuery(lastUserMessage);
  if (isZoneamentoQuery) {
    console.log(
      "[ai-orchestrator] Zoneamento/LPUOS query detected → skipping Vertex RAG, will use search_knowledge_base",
    );
  }
  if (isCamaraFuncionamentoQuery) {
    console.log(
      "[ai-orchestrator] Câmara funcionamento/estrutura → skipping Vertex RAG (Supabase KB + prompt)",
    );
  }

  if (collectionIntent?.type === "general" && isCamaraFuncionamentoQuery && !isZoneamentoQuery) {
    try {
      const kbText = await lib.searchKnowledgeBase(supabase, lastUserMessage);
      if (!kbText.includes("Não encontrei informações específicas")) {
        dynamicSystemPrompt = dynamicSystemPrompt +
          "\n\n[Contexto da base de conhecimento da Câmara (Supabase)]:\n" +
          kbText +
          "\n\nInstrução: Use o texto acima como base principal sobre o funcionamento e a estrutura da Câmara. Organize em linguagem simples; não contradiga esses trechos. Se faltar detalhe pontual, complemente de forma coerente com o que está escrito.";
        console.log(
          "[ai-orchestrator] Injected Supabase KB for Câmara funcionamento, chars:",
          kbText.length,
        );
      } else {
        console.log(
          "[ai-orchestrator] Supabase KB (Câmara funcionamento) sem trechos específicos; modelo pode usar search_knowledge_base",
        );
      }
    } catch (e) {
      console.warn(
        "[ai-orchestrator] Pré-busca searchKnowledgeBase (Câmara) falhou:",
        (e as Error).message,
      );
    }
  }

  if (
    collectionIntent?.type === "general" &&
    (vertexRagDatastore || vertexRagCorpus) &&
    finalAiApiKey &&
    lastUserMessage.trim().length > 3 &&
    !isZoneamentoQuery &&
    !isCamaraFuncionamentoQuery &&
    !lib.isBusInformationalQuery(lastUserMessage) &&
    !lib.isQuestionAboutProximasOuQuaisAudiencias(lastUserMessage)
  ) {
    try {
      const baseUrl = finalAiBaseUrl.replace(/\/$/, "");
      const match = baseUrl.match(/\/projects\/([^/]+)\/locations\/([^/]+)/);
      const project = match?.[1];
      const location = match?.[2];
      if (project && location) {
        const generateContentUrl =
          `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${project}/locations/${location}/publishers/google/models/${aiChatModel}:generateContent`;
        let datastorePath = (vertexRagDatastore || "").trim();
        if (vertexRagDatastore && !datastorePath.startsWith("projects/")) {
          datastorePath =
            `projects/${project}/locations/global/collections/default_collection/dataStores/${datastorePath}`;
          console.log("[ai-orchestrator] VERTEX_RAG_DATASTORE build full path:", datastorePath);
        }
        const retrievalTool = vertexRagDatastore
          ? { retrieval: { vertexAiSearch: { datastore: datastorePath } } }
          : { retrieval: { vertexRagStore: { ragResources: [{ ragCorpus: vertexRagCorpus }] } } };
        const ragBody = {
          contents: [{ role: "user", parts: [{ text: lastUserMessage }] }],
          tools: [retrievalTool],
        };
        const ragRes = await fetch(generateContentUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${finalAiApiKey}` },
          body: JSON.stringify(ragBody),
        });
        if (ragRes.ok) {
          const ragJson = await ragRes.json() as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const textPart = ragJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textPart && textPart.trim()) {
            dynamicSystemPrompt = dynamicSystemPrompt +
              "\n\n[Contexto da base de conhecimento da Câmara (Vertex RAG)]:\n" +
              textPart.trim() +
              "\n\nInstrução: Para esta dúvida, use APENAS o texto do bloco [Contexto da base de conhecimento da Câmara (Vertex RAG)] acima para responder. Não invoque search_knowledge_base nem outras buscas.";
            console.log(
              "[ai-orchestrator] Injected Vertex RAG context for general intent, length:",
              textPart.trim().length,
            );
          } else {
            const excerpt = (lastUserMessage || "").trim().slice(0, 120);
            console.log(
              "[ai-orchestrator] NÃO FOI POSSÍVEL ENCONTRAR ESTA INFORMAÇÃO NO RAG. Mensagem do usuário (trecho):",
              excerpt || "(vazia)",
            );
          }
        } else {
          console.warn(
            "[ai-orchestrator] Vertex RAG generateContent failed:",
            ragRes.status,
            await ragRes.text(),
          );
        }
      } else {
        console.warn(
          "[ai-orchestrator] Could not parse project/location from AI base URL for Vertex RAG",
        );
      }
    } catch (e) {
      console.warn("[ai-orchestrator] Vertex RAG fetch error:", (e as Error).message);
    }
  }

  if (lib.isBusInformationalQuery(lastUserMessage)) {
    dynamicSystemPrompt = dynamicSystemPrompt +
      "\n\n[CONTEXTO: Ônibus em São Paulo. Para PONTOS/PARADAS PRÓXIMOS A MIM com coordenadas: use find_nearby_services com service_type=transit_station (dados GeoSampa: pontos de ônibus, terminais). Para linhas/previsão: search_bus_lines, search_bus_stops (por nome/endereço), get_bus_line_itinerary, get_bus_arrival_forecast, get_bus_stop_forecast_all_lines.]";
    console.log("[ai-orchestrator] Bus informational query → injected Olho Vivo tool hint");
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const currentYear = now.getFullYear();
  dynamicSystemPrompt = dynamicSystemPrompt +
    `\n\n[DATA E AUDIÊNCIAS] Data de hoje: ${todayStr} (ano civil ${currentYear}). Ao falar de "este ano" use sempre o ano ${currentYear}. Para audiências públicas: use APENAS o texto retornado pela ferramenta search_audiencias; não invente audiências, datas nem resuma com outro ano.`;

  const vertexRagInjected = dynamicSystemPrompt.includes(
    "[Contexto da base de conhecimento da Câmara (Vertex RAG)]",
  );
  const supabaseCamaraKbInjected = dynamicSystemPrompt.includes(
    "[Contexto da base de conhecimento da Câmara (Supabase)]",
  );
  const suppressSearchKnowledgeBase = vertexRagInjected || supabaseCamaraKbInjected;
  const effectiveTools = suppressSearchKnowledgeBase
    ? (lib.tools as Array<{ type?: string; function?: { name?: string } }>).filter((t) =>
      t?.function?.name !== "search_knowledge_base"
    )
    : lib.tools;
  if (vertexRagInjected) {
    console.log(
      "[ai-orchestrator] Vertex RAG context injected → search_knowledge_base excluded from tools (prefer RAG)",
    );
  }
  if (supabaseCamaraKbInjected) {
    console.log(
      "[ai-orchestrator] Supabase KB (Câmara) injected → search_knowledge_base excluded from tools",
    );
  }

  return {
    dynamicSystemPrompt,
    effectiveTools,
  };
}
