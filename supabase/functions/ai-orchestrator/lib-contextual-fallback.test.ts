import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildContextualEmptyFallbackMessage,
  extractLastFieldRequestFromHistory,
} from "./lib-contextual-fallback.ts";

Deno.test("extractLastFieldRequestFromHistory retorna último campo do assistente", () => {
  const field = extractLastFieldRequestFromHistory([
    { role: "assistant", content: "[FIELD_REQUEST:description]Descreva" },
    { role: "user", content: "buraco" },
    { role: "assistant", content: "[FIELD_REQUEST:affected_scope]Quem mais?" },
  ]);
  assertEquals(field, "affected_scope");
});

Deno.test("buildContextualEmptyFallbackMessage usa dica do último campo", () => {
  const msg = buildContextualEmptyFallbackMessage({
    collectionIntent: { type: "urban_report", fields: {} },
    lastFieldRequest: "affected_scope",
    nextFieldInfo: { field: null, picker: null, prompt: null },
  });
  assertEquals(msg.includes("bairro"), true);
  assertEquals(msg.includes("reformul"), true);
});
