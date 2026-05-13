import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { handleDeterministicUrbanAutoCreate } from "./lib-index-urban-auto.ts";

Deno.test("handleDeterministicUrbanAutoCreate pede correção de gravidade", async () => {
  const result = await handleDeterministicUrbanAutoCreate({
    accumulatedFields: { category: "via_publica" },
    attachmentUrls: [],
    conversationId: undefined,
    lastAssistantLower:
      "certo. o que você gostaria de corrigir no resumo do relato?\n\nselecione uma opção abaixo.",
    lastAssistantMessage:
      "Certo. O que você gostaria de corrigir no resumo do relato?\n\nSelecione uma opção abaixo.[QUICK_REPLY:descrição,endereço,categoria,tipo_detalhe,gravidade,tipos_de_risco,afetação,cep,natureza]",
    lastUserMessage: "gravidade",
    msgLower: "gravidade",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("[FIELD_REQUEST:risk_level]"), true);
});

Deno.test("handleDeterministicUrbanAutoCreate pede correção de descrição", async () => {
  const result = await handleDeterministicUrbanAutoCreate({
    accumulatedFields: { category: "via_publica", description: "Existe um buraco na minha rua" },
    attachmentUrls: [],
    conversationId: undefined,
    lastAssistantLower:
      "certo. o que você gostaria de corrigir no resumo do relato?\n\nselecione uma opção abaixo.",
    lastAssistantMessage:
      "Certo. O que você gostaria de corrigir no resumo do relato?\n\nSelecione uma opção abaixo.[QUICK_REPLY:descrição,endereço,categoria,tipo_detalhe,gravidade,tipos_de_risco,afetação,cep,natureza]",
    lastUserMessage: "descrição",
    msgLower: "descrição",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: { corsHeaders: {} } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("[FIELD_REQUEST:description]"), true);
});

Deno.test("handleDeterministicUrbanAutoCreate pede correção de afetação", async () => {
  const result = await handleDeterministicUrbanAutoCreate({
    accumulatedFields: { category: "via_publica" },
    attachmentUrls: [],
    conversationId: undefined,
    lastAssistantLower:
      "certo. o que você gostaria de corrigir no resumo do relato?\n\nselecione uma opção abaixo.",
    lastAssistantMessage:
      "Certo. O que você gostaria de corrigir no resumo do relato?\n\nSelecione uma opção abaixo.[QUICK_REPLY:descrição,endereço,categoria,tipo_detalhe,gravidade,tipos_de_risco,afetação,cep,natureza]",
    lastUserMessage: "afetação",
    msgLower: "afetação",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: { corsHeaders: {} } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("[FIELD_REQUEST:affected_scope]"), true);
});

Deno.test("handleDeterministicUrbanAutoCreate volta ao preview após resposta a FIELD_REQUEST em correção", async () => {
  const accumulatedFields = {
    category: "via_publica",
    report_nature: "reclamacao",
    description: "Teste de edição de descrição.",
    street: "Avenida Lineu de Paula Machado",
    street_number: "1477",
    neighborhood: "Jardim Everest",
  };
  const result = await handleDeterministicUrbanAutoCreate({
    accumulatedFields,
    attachmentUrls: [],
    chatMessages: [
      { role: "user", content: "Existe um buraco na minha rua" },
      {
        role: "assistant",
        content:
          "Resumo do relato\n\nSe estiver tudo certo, clique em Confirmar para registrar ou em Corrigir para alterar algo.",
      },
      { role: "user", content: "corrigir" },
      {
        role: "assistant",
        content:
          "[COLLECTION_PROGRESS:urban_report:{}]Certo. O que você gostaria de corrigir no resumo do relato?\n\nSelecione uma opção abaixo.[QUICK_REPLY:descrição,endereço,categoria,tipo_detalhe,gravidade,tipos_de_risco,afetação,cep,natureza]",
      },
      { role: "user", content: "descrição" },
      {
        role: "assistant",
        content:
          "[COLLECTION_PROGRESS:urban_report:{}][FIELD_REQUEST:description]Qual é a descrição correta?",
      },
      { role: "user", content: "Teste de edição de descrição." },
    ],
    conversationId: undefined,
    getMessageText: (m) => (typeof m.content === "string" ? m.content : ""),
    lastAssistantLower:
      "[collection_progress:urban_report:{}][field_request:description]qual é a descrição correta?",
    lastAssistantMessage:
      "[COLLECTION_PROGRESS:urban_report:{}][FIELD_REQUEST:description]Qual é a descrição correta?",
    lastUserMessage: "Teste de edição de descrição.",
    msgLower: "teste de edição de descrição.",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      REPORT_NATURE_LABELS: { reclamacao: "Reclamação" },
      formatUrbanReportPreviewAfterCategory: () => "",
      formatUrbanReportPreviewAfterDescription: () => "",
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("**Resumo do relato**"), true);
  assertEquals(text.includes("Teste de edição de descrição."), true);
});

Deno.test("handleDeterministicUrbanAutoCreate mostra preview quando usuário recusa fotos", async () => {
  const result = await handleDeterministicUrbanAutoCreate({
    accumulatedFields: {
      category: "iluminacao",
      report_nature: "reclamacao",
      description: "Poste apagado na rua.",
      street: "Rua A",
      street_number: "123",
      neighborhood: "Centro",
    },
    attachmentUrls: [],
    conversationId: undefined,
    lastAssistantLower: "você deseja anexar imagens ao seu relato?",
    lastAssistantMessage: "Você deseja anexar imagens ao seu relato?",
    lastUserMessage: "não",
    msgLower: "não",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      REPORT_NATURE_LABELS: { reclamacao: "Reclamação" },
      formatUrbanReportPreviewAfterCategory: () => "",
      formatUrbanReportPreviewAfterDescription: () => "",
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("**Resumo do relato**"), true);
  assertEquals(text.includes("Rua A, 123 - Centro"), true);
});
