import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

import { orchestrateCollectionTurn } from "./lib-index-collection-orchestration.ts";
import {
  buildUrbanNonComplaintLlmInstruction,
  isUrbanNonComplaintReadyForLlmTurn,
  urbanNonComplaintLlmStatusLine,
} from "./lib-urban-rules.ts";

function createBaseLib(overrides: Record<string, unknown> = {}) {
  return {
    corsHeaders: {},
    systemPrompt: "BASE_PROMPT",
    isUrbanNonComplaintReadyForLlmTurn,
    buildUrbanNonComplaintLlmInstruction,
    urbanNonComplaintLlmStatusLine,
    ...overrides,
  };
}

Deno.test("orchestrateCollectionTurn retorna resposta de auto-create com markers", async () => {
  const result = await orchestrateCollectionTurn({
    accumulatedFields: { category: "iluminacao" },
    attachmentUrls: [],
    baseSystemPrompt: "BASE_PROMPT",
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
    baseSystemPrompt: "BASE_PROMPT",
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
    baseSystemPrompt: "BASE_PROMPT",
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

Deno.test("orchestrateCollectionTurn: duvida pronta não dispara auto-create e injeta modo resposta", async () => {
  let autoCreateCalled = false;
  const result = await orchestrateCollectionTurn({
    accumulatedFields: {
      report_nature: "duvida",
      description: "Quero saber sobre os serviços disponíveis na cidade de SP",
      category: "outro",
      subcategory: "Serviços da cidade",
    },
    attachmentUrls: [],
    baseSystemPrompt: "BASE_PROMPT",
    chatMessages: [],
    collectionIntent: { type: "urban_report", fields: {} },
    conversationId: null,
    dynamicSystemPrompt: "BASE_PROMPT",
    getMessageText: () => "",
    lastAssistantLower: "",
    lastAssistantMessage: "",
    lastUserMessage: "Me fale sobre os serviços da cidade de SP",
    lightJourneyMarker: "",
    msgLower: "me fale sobre os serviços da cidade de sp",
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    // deno-lint-ignore no-explicit-any
    supabaseClassificationFeedbackRead: null as any,
    userId: "user-1",
    deps: {
      getNextMissingField: async () => ({ field: null, picker: null, prompt: null }),
      handleDeterministicUrbanAutoCreate: async () => {
        autoCreateCalled = true;
        // deno-lint-ignore no-explicit-any
        return { toolResult: { success: true, message: "should not run" } } as any;
      },
    },
    // deno-lint-ignore no-explicit-any
    lib: createBaseLib() as any,
  });

  assertEquals(result.response, undefined);
  assertEquals(autoCreateCalled, false);
  assertEquals(result.dynamicSystemPrompt.includes("MODO DÚVIDA URBANA"), true);
  assertEquals(result.dynamicSystemPrompt.includes("Responda à dúvida do cidadão"), true);
  assertEquals(result.dynamicSystemPrompt.includes("create_urban_report"), true);
});

Deno.test("orchestrateCollectionTurn: sugestao pronta não dispara auto-create e injeta modo sugestão", async () => {
  let autoCreateCalled = false;
  const result = await orchestrateCollectionTurn({
    accumulatedFields: {
      report_nature: "sugestao",
      description: "Seria bom se tivéssemos mais policiamento nos parques",
      category: "outro",
      subcategory: "Policiamento em parques",
    },
    attachmentUrls: [],
    baseSystemPrompt: "BASE_PROMPT",
    chatMessages: [],
    collectionIntent: { type: "urban_report", fields: {} },
    conversationId: null,
    dynamicSystemPrompt: "BASE_PROMPT",
    getMessageText: () => "",
    lastAssistantLower: "",
    lastAssistantMessage: "",
    lastUserMessage: "Seria bom se tivéssemos mais policiamento nos parques",
    lightJourneyMarker: "",
    msgLower: "seria bom se tivéssemos mais policiamento nos parques",
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    // deno-lint-ignore no-explicit-any
    supabaseClassificationFeedbackRead: null as any,
    userId: "user-1",
    deps: {
      getNextMissingField: async () => ({ field: null, picker: null, prompt: null }),
      handleDeterministicUrbanAutoCreate: async () => {
        autoCreateCalled = true;
        // deno-lint-ignore no-explicit-any
        return { toolResult: { success: true, message: "should not run" } } as any;
      },
    },
    // deno-lint-ignore no-explicit-any
    lib: createBaseLib() as any,
  });

  assertEquals(result.response, undefined);
  assertEquals(autoCreateCalled, false);
  assertEquals(result.dynamicSystemPrompt.includes("MODO SUGESTÃO URBANA"), true);
  assertEquals(result.dynamicSystemPrompt.includes("Reconheça e converse sobre a sugestão"), true);
});

Deno.test("orchestrateCollectionTurn: elogio pronto injeta modo elogio e não dispara auto-create", async () => {
  let autoCreateCalled = false;
  const result = await orchestrateCollectionTurn({
    accumulatedFields: {
      report_nature: "elogio",
      description:
        "Gostaria de elogiar o policiamento e segurança na cidade de SP, sabemos que ainda há muito a melhorar, porém está evoluindo muito bem!",
      category: "outro",
      subcategory: "Policiamento e segurança",
    },
    attachmentUrls: [],
    baseSystemPrompt: "BASE_PROMPT",
    chatMessages: [],
    collectionIntent: { type: "urban_report", fields: {} },
    conversationId: null,
    dynamicSystemPrompt: "BASE_PROMPT",
    getMessageText: () => "",
    lastAssistantLower: "",
    lastAssistantMessage: "",
    lastUserMessage:
      "Gostaria de elogiar o policiamento e segurança na cidade de SP, sabemos que ainda há muito a melhorar, porém está evoluindo muito bem!",
    lightJourneyMarker: "",
    msgLower: "gostaria de elogiar o policiamento",
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    // deno-lint-ignore no-explicit-any
    supabaseClassificationFeedbackRead: null as any,
    userId: "user-1",
    deps: {
      getNextMissingField: async () => ({ field: null, picker: null, prompt: null }),
      handleDeterministicUrbanAutoCreate: async () => {
        autoCreateCalled = true;
        // deno-lint-ignore no-explicit-any
        return { toolResult: { success: true, message: "should not run" } } as any;
      },
    },
    // deno-lint-ignore no-explicit-any
    lib: createBaseLib() as any,
  });

  assertEquals(result.response, undefined);
  assertEquals(autoCreateCalled, false);
  assertEquals(result.dynamicSystemPrompt.includes("MODO ELOGIO URBANO"), true);
  assertEquals(result.dynamicSystemPrompt.includes("Agradeça e converse sobre o elogio"), true);
});

Deno.test("orchestrateCollectionTurn preserva falha terminal de service_rating", async () => {
  const result = await orchestrateCollectionTurn({
    accumulatedFields: { service_name: "UBS Centro" },
    attachmentUrls: [],
    baseSystemPrompt: "BASE_PROMPT",
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
