import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

import { orchestrateCollectionTurn } from "./lib-index-collection-orchestration.ts";

function createBaseLib(overrides: Record<string, unknown> = {}) {
  return {
    corsHeaders: {},
    systemPrompt: "BASE_PROMPT",
    ...overrides,
  };
}

Deno.test("orchestrateCollectionTurn retorna resposta de auto-create com markers", async () => {
  const result = await orchestrateCollectionTurn({
    accumulatedFields: { category: "iluminacao" },
    attachmentUrls: [],
    chatMessages: [],
    collectionIntent: { type: "urban_report", fields: {} },
    conversationId: "conv-1",
    dynamicSystemPrompt: "BASE_PROMPT",
    getMessageText: () => "",
    lastAssistantLower: "",
    lastAssistantMessage: "",
    lastUserMessage: "poste apagado",
    lightJourneyMarker: "",
    msgLower: "poste apagado",
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    // deno-lint-ignore no-explicit-any
    supabaseClassificationFeedbackRead: null as any,
    userId: "user-1",
    deps: {
      getNextMissingField: async () => ({ field: null, picker: null, prompt: null }),
      // deno-lint-ignore no-explicit-any
      handleDeterministicUrbanAutoCreate: async () => ({ toolResult: { success: true, message: "ok final" } }) as any,
    },
    // deno-lint-ignore no-explicit-any
    lib: createBaseLib() as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("[COLLECTION_PROGRESS:urban_report:{}]"), true);
});

Deno.test("orchestrateCollectionTurn retorna mensagem terminal (field=null, prompt!=null) sem chamar auto-create", async () => {
  let autoCreateCalled = false;
  const result = await orchestrateCollectionTurn({
    accumulatedFields: {
      report_nature: "reclamacao",
      description: "Buraco na rua",
      category: "via_publica",
      street: "Rua Salvador D'Agostinho",
      neighborhood: "Jardim Rosa de Franca",
      city: "Guarulhos",
      cep: "07081310",
    },
    attachmentUrls: [],
    chatMessages: [],
    collectionIntent: { type: "urban_report", fields: {} },
    conversationId: "conv-1",
    dynamicSystemPrompt: "BASE_PROMPT",
    getMessageText: () => "",
    lastAssistantLower: "",
    lastAssistantMessage: "",
    lastUserMessage: "Endereço selecionado: Rua Salvador D'Agostinho - Jardim Rosa de Franca, Guarulhos - CEP: 07081310",
    lightJourneyMarker: "",
    msgLower: "endereço selecionado",
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    // deno-lint-ignore no-explicit-any
    supabaseClassificationFeedbackRead: null as any,
    userId: "user-1",
    deps: {
      getNextMissingField: async () => ({
        field: null,
        picker: null,
        prompt: "Entendemos que o endereço informado é na **Guarulhos**. No entanto, este canal é exclusivo para atendimentos realizados na cidade de São Paulo.",
      }),
      handleDeterministicUrbanAutoCreate: async () => {
        autoCreateCalled = true;
        // deno-lint-ignore no-explicit-any
        return { toolResult: { success: true, message: "should not be called" } } as any;
      },
    },
    // deno-lint-ignore no-explicit-any
    lib: createBaseLib() as any,
  });

  assertExists(result.response);
  assertEquals(autoCreateCalled, false);
  const text = await result.response!.text();
  assertEquals(text.includes("Guarulhos"), true);
  assertEquals(text.includes("exclusivo para atendimentos"), true);
  assertEquals(text.includes("[COLLECTION_PROGRESS:urban_report:{}]"), true);
});

Deno.test("orchestrateCollectionTurn injeta contexto de coleta quando há campos", async () => {
  const result = await orchestrateCollectionTurn({
    accumulatedFields: { description: "há um incêndio no local", category: "iluminacao" },
    attachmentUrls: [],
    chatMessages: [],
    collectionIntent: { type: "urban_report", fields: {} },
    conversationId: null,
    dynamicSystemPrompt: "BASE_PROMPT",
    getMessageText: () => "",
    lastAssistantLower: "",
    lastAssistantMessage: "",
    lastUserMessage: "há um incêndio no local",
    lightJourneyMarker: "",
    msgLower: "há um incêndio no local",
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    // deno-lint-ignore no-explicit-any
    supabaseClassificationFeedbackRead: null as any,
    userId: "user-1",
    deps: {
      getNextMissingField: async () => ({ field: "category", picker: null, prompt: "Qual a categoria?" }),
    },
    // deno-lint-ignore no-explicit-any
    lib: createBaseLib() as any,
  });

  assertEquals(result.response, undefined);
  assertEquals(result.dynamicSystemPrompt.includes("=== CONTEXTO ATUAL DA COLETA ==="), true);
  assertEquals(result.dynamicSystemPrompt.includes("ATENÇÃO - CONTEÚDO URGENTE / GRAVE"), true);
});

Deno.test("orchestrateCollectionTurn preserva falha terminal de service_rating", async () => {
  const result = await orchestrateCollectionTurn({
    accumulatedFields: { service_name: "UBS Centro" },
    attachmentUrls: [],
    chatMessages: [],
    collectionIntent: { type: "service_rating", fields: {} },
    conversationId: null,
    dynamicSystemPrompt: "BASE_PROMPT",
    getMessageText: () => "",
    lastAssistantLower: "",
    lastAssistantMessage: "",
    lastUserMessage: "quero avaliar",
    lightJourneyMarker: "[LIGHT_JOURNEY:service_rating]",
    msgLower: "quero avaliar",
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    // deno-lint-ignore no-explicit-any
    supabaseClassificationFeedbackRead: null as any,
    userId: "user-1",
    deps: {
      getNextMissingField: async () => ({ field: null, picker: null, prompt: null }),
      // deno-lint-ignore no-explicit-any
      handleDeterministicServiceRatingAutoCreate: async () => ({ toolResult: { success: false, message: "Falha terminal" } }) as any,
    },
    // deno-lint-ignore no-explicit-any
    lib: createBaseLib() as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("[LIGHT_JOURNEY:service_rating]"), true);
});
