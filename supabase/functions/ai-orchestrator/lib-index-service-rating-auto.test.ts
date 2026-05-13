import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { handleDeterministicServiceRatingAutoCreate } from "./lib-index-service-rating-auto.ts";

Deno.test("handleDeterministicServiceRatingAutoCreate retorna preview de submissão", async () => {
  const result = await handleDeterministicServiceRatingAutoCreate({
    accumulatedFields: {
      rating_text: "Atendimento muito bom e organizado.",
      rating_dimensions: {
        tempo_espera: 4,
        atendimento: 5,
        infraestrutura: 4,
        limpeza: 5,
      },
      service_name: "UBS Centro",
    },
    lastAssistantMessage:
      '[FIELD_REQUEST:rating_text]Você tem alguma **sugestão de melhoria** ou quer deixar um comentário extra?',
    lightJourneyMarker: "[LIGHT_JOURNEY:service_rating]",
    msgLower: "comentário válido",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      isCompleteServiceRatingDimensions: () => true,
      aggregateRatingDimensionsStars: () => 5,
      executeTool: async () => ({ success: true, message: "ok" }),
      inferServiceRatingSentimentFromMean: () => "positivo",
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("[RATING_SUBMIT_PREVIEW]"), true);
  assertEquals(text.includes("UBS Centro"), true);
});
