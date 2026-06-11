import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { LIGHT_JOURNEY_TYPES, resolveCollectionIntent } from "./lib-index-collection-intent.ts";

function createLibMock(overrides: Record<string, unknown> = {}) {
  return {
    accumulateFieldsFromHistory: () => ({}),
    detectCollectionIntent: () => ({ type: "general", fields: {} }),
    isBareUrbanReportNatureReply: () => false,
    isGenericIntentText: () => false,
    isInformationalQuestionAboutAudience: () => false,
    isInformationalQuestionAboutBuscarAudiencia: () => false,
    isInformationalQuestionAboutContact: () => false,
    isInformationalQuestionAboutProjetosTramitacao: () => false,
    isInformationalQuestionAboutVereadorOrCamara: () => false,
    isOutOfScopeQuestion: () => false,
    isValidDomainDescription: () => false,
    messageLooksLikeUrbanIncidentStarter: () => false,
    normalizeReportNature: () => null,
    ...overrides,
  };
}

Deno.test("LIGHT_JOURNEY_TYPES mantém os tipos leves esperados", () => {
  assertEquals(LIGHT_JOURNEY_TYPES.includes("services"), true);
  assertEquals(LIGHT_JOURNEY_TYPES.includes("general"), true);
});

Deno.test("resolveCollectionIntent respeita JOURNEY_SWITCHED como prioridade máxima", async () => {
  const result = await resolveCollectionIntent({
    chatHistoryTyped: [],
    chatMessages: [],
    corsHeaders: {},
    frontendCollectionType: "services",
    lastAssistantText: "",
    lastUserMsg: "[JOURNEY_SWITCHED:urban_report]",
    // deno-lint-ignore no-explicit-any
    lib: createLibMock() as any,
  });

  assertEquals(result.response, undefined);
  assertEquals(result.journeySwitched, true);
  assertEquals(result.journeyDeclined, false);
  assertEquals(result.collectionIntent, { type: "urban_report", fields: {} });
});

Deno.test("resolveCollectionIntent força services no refinamento de filtro mesmo com frontendCollectionType=general", async () => {
  // Cenário do bug: após os resultados, o app envia o chip "Raio: ... Avaliação mínima: ..."
  // com collectionType general/leve → o ramo de light-journey confiava nisso e a mensagem caía
  // na LLM. Deve forçar services pelo padrão "Raio:", independentemente do frontendCollectionType.
  const result = await resolveCollectionIntent({
    chatHistoryTyped: [],
    chatMessages: [],
    corsHeaders: {},
    frontendCollectionType: "general",
    lastAssistantText: "Encontrei 10 parques perto de você:",
    lastUserMsg: "Raio: 5km. Avaliação mínima: todas",
    // deno-lint-ignore no-explicit-any
    lib: createLibMock() as any,
  });

  assertEquals(result.response, undefined);
  assertEquals(result.collectionIntent, { type: "services", fields: {} });
});

Deno.test("resolveCollectionIntent retorna prompt ao detectar conflito entre jornada estruturada e intenção nova", async () => {
  const result = await resolveCollectionIntent({
    chatHistoryTyped: [{ role: "user", content: "quero avaliar uma UBS" }],
    chatMessages: [{ role: "user", content: "quero avaliar uma UBS" }],
    corsHeaders: {},
    frontendCollectionType: "urban_report",
    lastAssistantText: "",
    lastUserMsg: "quero avaliar uma UBS",
    // deno-lint-ignore no-explicit-any
    lib: createLibMock({
      accumulateFieldsFromHistory: () => ({ category: "iluminacao", description: "poste apagado" }),
      detectCollectionIntent: () => ({ type: "service_rating", fields: { service_type: "ubs" } }),
    }) as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("[JOURNEY_SWITCH_PROMPT:service_rating:urban_report]"), true);
  assertEquals(text.includes("Avaliação de Serviço"), true);
  assertEquals(result.journeySwitched, false);
});

Deno.test("resolveCollectionIntent preserva contexto urbano em confirmação de endereço dentro de services", async () => {
  const result = await resolveCollectionIntent({
    chatHistoryTyped: [
      { role: "assistant", content: "[COLLECTION_PROGRESS:urban_report] Qual é a avenida?" },
      { role: "user", content: "CEP: 04000-000 Avenida Paulista" },
    ],
    chatMessages: [
      { role: "assistant", content: "[COLLECTION_PROGRESS:urban_report] Qual é a avenida?" },
      { role: "user", content: "CEP: 04000-000 Avenida Paulista" },
    ],
    corsHeaders: {},
    frontendCollectionType: "services",
    lastAssistantText: "[COLLECTION_PROGRESS:urban_report] Qual é a avenida?",
    lastUserMsg: "CEP: 04000-000 Avenida Paulista",
    // deno-lint-ignore no-explicit-any
    lib: createLibMock({
      accumulateFieldsFromHistory: () => ({ category: "iluminacao", description: "poste apagado" }),
    }) as any,
  });

  assertEquals(result.collectionIntent, { type: "urban_report", fields: {} });
  assertEquals(result.journeySwitched, false);
});

Deno.test("resolveCollectionIntent rebaixa pergunta informativa para general", async () => {
  const result = await resolveCollectionIntent({
    chatHistoryTyped: [{ role: "user", content: "como funciona audiência pública?" }],
    chatMessages: [{ role: "user", content: "como funciona audiência pública?" }],
    corsHeaders: {},
    frontendCollectionType: "",
    lastAssistantText: "",
    lastUserMsg: "como funciona audiência pública?",
    // deno-lint-ignore no-explicit-any
    lib: createLibMock({
      detectCollectionIntent: () => ({ type: "audiencias", fields: {} }),
      isInformationalQuestionAboutAudience: () => true,
    }) as any,
  });

  assertEquals(result.collectionIntent, { type: "general", fields: {} });
});
