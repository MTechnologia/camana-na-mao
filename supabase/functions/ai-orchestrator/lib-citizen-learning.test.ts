import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { getPersonalizedPromptAdditions } from "./lib-citizen-learning.ts";

Deno.test("getPersonalizedPromptAdditions: retorna vazio sem perfil", () => {
  assertEquals(getPersonalizedPromptAdditions(null), "");
});

Deno.test("getPersonalizedPromptAdditions: inclui tom e contexto recorrente", () => {
  const result = getPersonalizedPromptAdditions({
    common_categories: ["iluminacao", "lixo", "calcada"],
    common_keywords: [],
    communication_style: "concise",
    avg_message_length: 18,
    prefers_short_responses: true,
    frequent_services: [],
    frequent_transport_lines: ["875A-10", "917H-10"],
    total_reports: 3,
    total_conversations: 2,
    last_known_address: { neighborhood: "Pinheiros" },
  });

  assertStringIncludes(result, "O cidadão prefere respostas CURTAS e diretas.");
  assertStringIncludes(result, "É no mesmo local (Pinheiros)?");
  assertStringIncludes(result, "iluminacao, lixo, calcada");
  assertStringIncludes(result, "875A-10, 917H-10");
});
