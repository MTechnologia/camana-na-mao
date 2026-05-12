import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { handleDeterministicTransportAutoCreate } from "./lib-index-transport-auto.ts";

Deno.test("handleDeterministicTransportAutoCreate pede subcategoria quando inválida", async () => {
  const result = await handleDeterministicTransportAutoCreate({
    accumulatedFields: { report_type: "atraso" },
    attachmentUrls: [],
    chatMessages: [],
    getMessageText: () => "",
    lastAssistantLower: "",
    lastAssistantMessage: "",
    lastUserMessage: "",
    msgLower: "",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      isValidTransportSubcategory: () => false,
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("[FIELD_REQUEST:sub_category]"), true);
  assertEquals(text.includes("[SUBCATEGORY_PICKER:atraso]"), true);
});
