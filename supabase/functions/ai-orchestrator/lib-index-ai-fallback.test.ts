import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  handleAiFatalError,
  handleAiNonStreamResponse,
  handleAiStreamFallback,
} from "./lib-index-ai-fallback.ts";

Deno.test("handleAiStreamFallback usa nextFieldInfo quando conteúdo vem vazio", async () => {
  const result = await handleAiStreamFallback({
    accumulatedFields: { service_type: "ubs" },
    chatMessages: [
      { role: "assistant", content: "[FIELD_REQUEST:rating_dimensions]Avalie" },
      { role: "user", content: "ok" },
    ],
    collectionIntent: { type: "service_rating", fields: {} },
    fullContent: "",
    lastUserMsg: "quero avaliar",
    lightJourneyMarker: "[LIGHT_JOURNEY:service_rating]",
    nextFieldInfo: {
      field: "rating_dimensions",
      picker: "[RATING_DIMENSIONS_PICKER]",
      prompt: "Como você avaliaria as dimensões?",
    },
    requestStartTime: Date.now(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      fetchServiceTypeRatingQuestionHints: async () => "\n\n[DICAS]",
      isInformationalQuestionAboutBuscarAudiencia: () => false,
      isInformationalQuestionAboutAudience: () => false,
    } as any,
  });

  const text = await result.text();
  assertEquals(text.includes("[LIGHT_JOURNEY:service_rating]"), true);
  assertEquals(text.includes("[FIELD_REQUEST:rating_dimensions]"), true);
  assertEquals(text.includes("[DICAS]"), true);
  assertEquals(text.includes("[RATING_DIMENSIONS_PICKER]"), true);
});

Deno.test("handleAiNonStreamResponse retorna resposta regular com collection progress", async () => {
  const response = new Response(
    JSON.stringify({
      choices: [{ message: { content: "Resposta final" } }],
    }),
    { headers: { "content-type": "application/json" } },
  );

  const result = await handleAiNonStreamResponse({
    accumulatedFields: { category: "lixo" },
    attachmentUrls: [],
    collectionIntent: { type: "urban_report", fields: {} },
    lastAssistantLower: "",
    requestStartTime: Date.now(),
    response,
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
    } as any,
  });

  const text = await result.text();
  assertEquals(text.includes("[COLLECTION_PROGRESS:urban_report:"), true);
  assertEquals(text.includes("Resposta final"), true);
});

Deno.test("handleAiFatalError retorna SSE amigável", async () => {
  const result = handleAiFatalError(new Error("falha"), Date.now(), {});
  assertExists(result);
  const text = await result.text();
  assertEquals(text.includes("ocorreu um erro inesperado"), true);
});
