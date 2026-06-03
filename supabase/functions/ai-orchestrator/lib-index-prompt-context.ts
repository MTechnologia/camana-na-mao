import type { SupabaseClient } from "@supabase/supabase-js";

import { buildVertexPublisherModelId } from "../_shared/ai-provider.ts";
import type { CollectionIntent } from "./lib.ts";
import { createSseResponse } from "./lib-index-sse.ts";
import { inferServiceTypeFromText } from "./lib-service-discovery.ts";
import { isVertexRagEnabled } from "./lib-vertex-rag.ts";

/**
 * "Onde fica a UBS Vila Maria?" feita como *dúvida* urbana NÃO é pergunta para a
 * base de conhecimento da Câmara — é busca de localização de um serviço público,
 * cujo endereço o app conhece (public_services / find_nearby_services). Sem isto,
 * o turno caía na base da Câmara, não achava nada e respondia genericamente
 * ("a base da Câmara não tem o endereço — procure a Prefeitura/156/Busca Saúde").
 *
 * Retorna o service_type inferido quando a dúvida é, na verdade, uma pergunta de
 * localização de serviço; caso contrário, null.
 */
export function detectServiceLocationDuvida(description: string): string | null {
  const text = (description || "").trim();
  if (!text) return null;
  const asksLocation =
    /(\bonde\b|\bfica\b|\bficam\b|localiza|endere[cç]o|\bperto\b|pr[oó]xim|como\s+che(?:go|gar))/i.test(text);
  if (!asksLocation) return null;
  return inferServiceTypeFromText(text);
}

const SERVICE_QUERY_STOPWORDS = new Set([
  "onde", "fica", "ficam", "localizacao", "localiza", "localizada", "localizado", "endereco",
  "perto", "proximo", "proxima", "proximos", "proximas", "mais", "como", "chego", "chegar",
  "qual", "quais", "gostaria", "quero", "saber", "favor", "por", "me", "dizer", "tem", "ha", "existe",
  "uma", "um", "a", "o", "os", "as", "de", "da", "do", "das", "dos", "na", "no", "nas", "nos", "em", "pra", "para",
]);

/**
 * Extrai o termo de busca de um pedido de localização ("Onde fica a usb vila
 * maria" → "ubs vila maria"): corrige o typo usb→ubs e remove palavras de
 * pergunta/localização, para casar com getServiceAddressByName (full-text).
 */
export function extractServiceSearchTerm(description: string): string {
  const normalized = (description || "")
    .toLowerCase()
    .replace(/\busb\b/g, "ubs")
    .replace(/[?!.,;:]/g, " ");
  const kept = normalized
    .split(/\s+/)
    .filter(Boolean)
    .filter((tok) => !SERVICE_QUERY_STOPWORDS.has(tok.normalize("NFD").replace(/\p{M}/gu, "")));
  const term = kept.join(" ").trim();
  return term.length >= 3 ? term : (description || "").trim();
}

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
  const vertexPublisherModelId = buildVertexPublisherModelId(aiChatModel);

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

  const urbanReportNature = String(accumulatedFields?.report_nature ?? "").toLowerCase();
  const urbanDuvidaDescription = String(accumulatedFields?.description ?? "").trim();
  const isUrbanDuvidaLlmTurn = collectionIntent?.type === "urban_report" &&
    urbanReportNature === "duvida" &&
    urbanDuvidaDescription.length >= 12 &&
    !lib.isCamaraFuncionamentoInternoQuery(urbanDuvidaDescription);

  if (isUrbanDuvidaLlmTurn) {
    const duvidaServiceType = detectServiceLocationDuvida(urbanDuvidaDescription);
    if (duvidaServiceType) {
      // Pergunta de localização de serviço público (ex.: "Onde fica a UBS Vila
      // Maria?"). Primeiro tenta ATERRISSAR no endereço real do public_services
      // (ETL GeoSampa) — o modelo estava inventando endereço (alucinou "Tamandaré
      // de Toledo, 306" sendo que o correto é "R. André da Fonseca, 70").
      const serviceSearchTerm = extractServiceSearchTerm(urbanDuvidaDescription);
      const hasNamedTarget = serviceSearchTerm.split(/\s+/).filter(Boolean).length >= 2;
      let groundedAddress: string | null = null;
      if (hasNamedTarget && typeof lib.getServiceAddressByName === "function") {
        try {
          groundedAddress = await lib.getServiceAddressByName(supabase, serviceSearchTerm);
        } catch (e) {
          console.warn(
            "[ai-orchestrator] getServiceAddressByName (duvida) falhou:",
            (e as Error).message,
          );
        }
      }
      if (groundedAddress) {
        dynamicSystemPrompt = dynamicSystemPrompt +
          `\n\n[Endereço oficial do serviço público — base do app]:\n${groundedAddress}\n\nInstrução: Responda informando EXATAMENTE este endereço (e o telefone, se houver) como está acima. **Proibido** inventar, alterar ou completar o endereço com qualquer outra fonte. NÃO diga que a base da Câmara não possui o endereço e NÃO encaminhe para 156/Prefeitura/Busca Saúde — o endereço já está acima.`;
        console.log(
          "[ai-orchestrator] Urban duvida: endereço de serviço aterrissado do public_services:",
          serviceSearchTerm,
        );
      } else {
        // Sem correspondência por nome: orienta a ferramenta de busca, mas proíbe
        // inventar — endereço só pode vir do que a ferramenta retornar.
        dynamicSystemPrompt = dynamicSystemPrompt +
          `\n\n[Dúvida sobre localização de serviço público]: O cidadão quer saber onde fica / como chegar a um equipamento público (tipo: ${duvidaServiceType}). Use a ferramenta **find_nearby_services** com service_type="${duvidaServiceType}" e, se ele citar um bairro/região (ex.: "Vila Maria"), passe-o em district, e responda com o **endereço retornado pela ferramenta**. **NUNCA invente um endereço**: se a ferramenta não retornar nada, diga com honestidade que não localizou e ofereça o canal oficial (156). NÃO afirme que a base da Câmara não possui o endereço antes de tentar a busca de serviços do app.`;
        console.log(
          "[ai-orchestrator] Urban duvida é pergunta de localização de serviço → orientando find_nearby_services:",
          duvidaServiceType,
        );
      }
    } else {
      try {
        const kb = await lib.searchKnowledgeBaseForUrbanDuvida(supabase, urbanDuvidaDescription);
        if (kb.hasRelevantHits && kb.text.trim()) {
          dynamicSystemPrompt = dynamicSystemPrompt +
            "\n\n[Contexto da base (dúvida urbana)]:\n" +
            kb.text.trim() +
            "\n\nInstrução: Responda **primeiro** à pergunta do cidadão usando apenas trechos acima que forem pertinentes. Não liste estrutura genérica da Câmara (portal, presidência, vereadores, transparência) se não for o tema da pergunta.";
          console.log(
            "[ai-orchestrator] Injected Supabase KB for urban duvida, chars:",
            kb.text.length,
          );
        } else {
          const excerpt = urbanDuvidaDescription.slice(0, 220);
          dynamicSystemPrompt = dynamicSystemPrompt +
            `\n\n[Contexto dúvida urbana — sem trecho na base]: A base da Câmara não trouxe trecho específico sobre: "${excerpt}".\n\nInstrução: Responda **diretamente** à pergunta com honestidade. Explique o papel da Câmara Municipal no tema (fiscalização, leis, audiências) sem inventar etapas operacionais do Executivo. Indique canais oficiais adequados (Prefeitura 156, PM 190, portais municipais). **Proibido** listar portal, presidência, vereadores, transparência ou biblioteca da Câmara nesta resposta.`;
          // [rag-underuse] Guarda desviou do Vertex RAG e a KB Supabase não trouxe trecho:
          // sinaliza turno onde o RAG poderia ter ajudado (decision RAG subutilizado, Option C).
          console.log(
            "[rag-underuse] urban_duvida: KB Supabase sem trecho relevante — Vertex RAG poderia ajudar:",
            urbanDuvidaDescription.slice(0, 120),
          );
        }
      } catch (e) {
        console.warn(
          "[ai-orchestrator] Pré-busca searchKnowledgeBaseForUrbanDuvida falhou:",
          (e as Error).message,
        );
      }
    }
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
        // [rag-underuse] Câmara funcionamento roteado p/ KB Supabase (Vertex RAG pulado pela guarda),
        // mas a KB não trouxe trecho — sinaliza turno onde o RAG poderia ter ajudado (Option C).
        console.log(
          "[rag-underuse] general+funcionamento: KB Supabase sem trecho específico — Vertex RAG poderia ajudar:",
          lastUserMessage.slice(0, 120),
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
    isVertexRagEnabled() &&
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
        // O host deve vir da própria base URL: a location `global` usa
        // `aiplatform.googleapis.com`, enquanto regiões usam
        // `{region}-aiplatform.googleapis.com`. Reconstruir como
        // `${location}-aiplatform...` gera `global-aiplatform...` (404).
        // Ver bug 2026-06-01-vertex-rag-generatecontent-404.
        let apiHost = `https://${location}-aiplatform.googleapis.com`;
        try {
          apiHost = new URL(finalAiBaseUrl).origin;
        } catch (_e) {
          // mantém o fallback regional acima
        }
        const generateContentUrl =
          `${apiHost}/v1beta1/projects/${project}/locations/${location}/publishers/google/models/${vertexPublisherModelId}:generateContent`;
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
  const urbanDuvidaKbInjected = dynamicSystemPrompt.includes("[Contexto da base (dúvida urbana)]") ||
    dynamicSystemPrompt.includes("[Contexto dúvida urbana — sem trecho na base]");
  const suppressSearchKnowledgeBase = vertexRagInjected || supabaseCamaraKbInjected ||
    urbanDuvidaKbInjected;
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
  if (urbanDuvidaKbInjected) {
    console.log(
      "[ai-orchestrator] Urban duvida KB/context injected → search_knowledge_base excluded from tools",
    );
  }

  return {
    dynamicSystemPrompt,
    effectiveTools,
  };
}
