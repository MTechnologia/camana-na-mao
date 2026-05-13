import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { handleDeterministicUrbanAutoCreate } from "./lib-index-urban-auto.ts";

Deno.test("handleDeterministicUrbanAutoCreate pede correção de gravidade", async () => {
  const result = await handleDeterministicUrbanAutoCreate({
    accumulatedFields: { category: "via_publica" },
    attachmentUrls: [],
    conversationId: undefined,
    lastAssistantLower: "selecione uma opção abaixo [quick_reply:descrição,endereço,gravidade]",
    lastAssistantMessage: "Selecione uma opção abaixo.[QUICK_REPLY:descrição,endereço,gravidade]",
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
