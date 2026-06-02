import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { handleDeterministicShortcuts } from "./lib-index-deterministic-shortcuts.ts";

Deno.test("handleDeterministicShortcuts retorna endereço de serviço do banco", async () => {
  const result = await handleDeterministicShortcuts({
    accumulatedFields: {},
    chatMessages: [],
    collectionIntent: null,
    journeySwitched: false,
    lastUserMessage: "Qual o endereço do CEU Butantã?",
    lastUserMsg: "Qual o endereço do CEU Butantã?",
    msgLower: "qual o endereço do ceu butantã?",
    nextFieldInfo: { field: null, picker: null, prompt: null },
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      getServiceAddressByName: async () => "CEU Butantã - Rua Exemplo, 123",
      isGeneralKnowledgeOutOfScope: () => false,
      isPoliticianPerformanceEvaluationQuestion: () => false,
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("CEU Butantã - Rua Exemplo, 123"), true);
});

Deno.test("handleDeterministicShortcuts retorna mensagem fora de escopo sem chamar LLM", async () => {
  const result = await handleDeterministicShortcuts({
    accumulatedFields: {},
    chatMessages: [],
    collectionIntent: null,
    journeySwitched: false,
    lastUserMessage: "Quem é o presidente dos EUA?",
    lastUserMsg: "Quem é o presidente dos EUA?",
    msgLower: "quem é o presidente dos eua?",
    nextFieldInfo: { field: null, picker: null, prompt: null },
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      isGeneralKnowledgeOutOfScope: () => true,
      isPoliticianPerformanceEvaluationQuestion: () => false,
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("não está relacionada aos serviços da Câmara Municipal de São Paulo"), true);
  assertEquals(text.includes("[SHOW_SERVICES_CHIPS]"), true);
});

Deno.test("handleDeterministicShortcuts monta short-circuit com hints de avaliação", async () => {
  const result = await handleDeterministicShortcuts({
    accumulatedFields: { service_type: "ubs" },
    chatMessages: [],
    collectionIntent: { type: "service_rating", fields: {} },
    journeySwitched: true,
    lastUserMessage: "quero avaliar",
    lastUserMsg: "quero avaliar",
    msgLower: "quero avaliar",
    nextFieldInfo: {
      field: "rating_dimensions",
      picker: "[RATING_DIMENSIONS_PICKER]",
      prompt: "Como você avaliaria as dimensões do atendimento?",
    },
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      isGeneralKnowledgeOutOfScope: () => false,
      isPoliticianPerformanceEvaluationQuestion: () => false,
      fetchServiceTypeRatingQuestionHints: async () => "\n\n[DICAS_AVALIACAO]",
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("[FIELD_REQUEST:rating_dimensions]"), true);
  assertEquals(text.includes("Ok! Como você avaliaria as dimensões do atendimento?"), true);
  assertEquals(text.includes("[DICAS_AVALIACAO]"), true);
  assertEquals(text.includes("[RATING_DIMENSIONS_PICKER]"), true);
});

Deno.test("handleDeterministicShortcuts: NREF005 — 'oi' no meio do relato continua a coleta (não reseta p/ menu)", async () => {
  const result = await handleDeterministicShortcuts({
    accumulatedFields: {
      report_nature: "reclamacao",
      description: "Todo dia o motorista passa e não para no ponto",
    },
    chatMessages: [],
    collectionIntent: { type: "urban_report", fields: {} },
    journeySwitched: false,
    lastUserMessage: "oi",
    lastUserMsg: "oi",
    msgLower: "oi",
    nextFieldInfo: {
      field: "location_method",
      picker: "[LOCATION_METHOD_PICKER]",
      prompt: "Como você quer informar onde fica o problema?",
    },
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      isGeneralKnowledgeOutOfScope: () => false,
      isPoliticianPerformanceEvaluationQuestion: () => false,
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  // NÃO reseta para o menu de boas-vindas
  assertEquals(text.includes("[SHOW_SERVICES_CHIPS]"), false);
  assertEquals(text.includes("Como posso ajudar?"), false);
  // continua de onde parou
  assertEquals(text.includes("Olá! Vamos continuar o seu relato."), true);
  assertEquals(text.includes("[FIELD_REQUEST:location_method]"), true);
});

Deno.test("handleDeterministicShortcuts: 'oi' SEM jornada ativa ainda mostra o menu (comportamento preservado)", async () => {
  const result = await handleDeterministicShortcuts({
    accumulatedFields: {},
    chatMessages: [],
    collectionIntent: null,
    journeySwitched: false,
    lastUserMessage: "oi",
    lastUserMsg: "oi",
    msgLower: "oi",
    nextFieldInfo: { field: null, picker: null, prompt: null },
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      isGeneralKnowledgeOutOfScope: () => false,
      isPoliticianPerformanceEvaluationQuestion: () => false,
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("[SHOW_SERVICES_CHIPS]"), true);
});
