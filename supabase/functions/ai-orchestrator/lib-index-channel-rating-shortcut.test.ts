import { assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { handleChannelRatingShortcut } from "./lib-index-channel-rating-shortcut.ts";

Deno.test("handleChannelRatingShortcut: registra estrelas e agradece", async () => {
  const result = await handleChannelRatingShortcut({
    lastAssistantText:
      "Encerramento\n[FIELD_REQUEST:channel_rating]Avalie\n\n[RATING_PICKER]",
    lastUserTextEarly: "Nota: 5 estrelas [RATING_SELECTED:5]",
    corsHeaders: {},
    supabase: {} as never,
    userId: "user-1",
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertStringIncludes(text, "Muito obrigado");
  assertStringIncludes(text, "5 estrela");
});

Deno.test("handleChannelRatingShortcut: despedida sem nota", async () => {
  const result = await handleChannelRatingShortcut({
    lastAssistantText:
      "[FIELD_REQUEST:channel_rating]Avalie\n\n[RATING_PICKER]",
    lastUserTextEarly: "Muito obrigado, por hora é só isso!",
    corsHeaders: {},
    supabase: {} as never,
    userId: "user-1",
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertStringIncludes(text, "De nada");
});
