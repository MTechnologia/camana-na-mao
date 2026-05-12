import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { buildAccumulatedContext } from "./lib-index-accumulated-context.ts";

function createLibMock(overrides: Record<string, unknown> = {}) {
  return {
    accumulateFieldsFromHistory: () => ({}),
    isBareUrbanReportNatureReply: () => false,
    isGenericIntentText: () => false,
    isValidDomainDescription: () => false,
    lookupCEP: async () => ({ valid: false }),
    messageLooksLikeUrbanIncidentStarter: () => false,
    normalizeReportNature: () => null,
    ...overrides,
  };
}

Deno.test("buildAccumulatedContext injeta evaluationContext em service_rating", async () => {
  const result = await buildAccumulatedContext({
    chatHistoryTyped: [],
    chatMessages: [],
    collectionIntent: { type: "service_rating", fields: { rating: 4 } },
    evaluationContext: { visit_id: "visit-1", service_type: "ubs" },
    journeyDeclined: false,
    journeySwitched: false,
    lastUserMsg: "quero avaliar",
    // deno-lint-ignore no-explicit-any
    lib: createLibMock({
      accumulateFieldsFromHistory: () => ({ service_name: "UBS Centro" }),
    }) as any,
  });

  assertEquals(result.accumulatedFields, {
    rating: 4,
    service_name: "UBS Centro",
    service_type: "ubs",
    visit_id: "visit-1",
  });
  assertEquals(result.lightJourneyMarker, "");
});

Deno.test("buildAccumulatedContext resolve CEP faltante e preenche endereço", async () => {
  const result = await buildAccumulatedContext({
    chatHistoryTyped: [],
    chatMessages: [],
    collectionIntent: { type: "urban_report", fields: {} },
    evaluationContext: null,
    journeyDeclined: false,
    journeySwitched: false,
    lastUserMsg: "04000-000",
    // deno-lint-ignore no-explicit-any
    lib: createLibMock({
      accumulateFieldsFromHistory: () => ({ cep: "04000-000" }),
      lookupCEP: async () => ({
        city: "São Paulo",
        neighborhood: "Vila Mariana",
        state: "SP",
        street: "Rua Exemplo",
        valid: true,
      }),
    }) as any,
  });

  assertEquals(result.accumulatedFields, {
    cep: "04000-000",
    city: "São Paulo",
    neighborhood: "Vila Mariana",
    state: "SP",
    street: "Rua Exemplo",
  });
});

Deno.test("buildAccumulatedContext aplica atalho de incidente urbano e marker de jornada leve", async () => {
  const result = await buildAccumulatedContext({
    chatHistoryTyped: [],
    chatMessages: [{ role: "user", content: "tem um incêndio agora na comunidade" }],
    collectionIntent: { type: "general", fields: {} },
    evaluationContext: null,
    journeyDeclined: false,
    journeySwitched: false,
    lastUserMsg: "qual horário da Câmara?",
    // deno-lint-ignore no-explicit-any
    lib: createLibMock(),
  });

  assertEquals(result.lightJourneyMarker, "[LIGHT_JOURNEY:general]");
});

Deno.test("buildAccumulatedContext define report_nature e description para abertura urbana grave", async () => {
  const result = await buildAccumulatedContext({
    chatHistoryTyped: [],
    chatMessages: [{ role: "user", content: "tem um incêndio agora na comunidade" }],
    collectionIntent: { type: "urban_report", fields: {} },
    evaluationContext: null,
    journeyDeclined: false,
    journeySwitched: false,
    lastUserMsg: "tem um incêndio agora na comunidade",
    // deno-lint-ignore no-explicit-any
    lib: createLibMock({
      isValidDomainDescription: () => true,
      messageLooksLikeUrbanIncidentStarter: () => true,
    }) as any,
  });

  assertEquals(result.accumulatedFields.description, "tem um incêndio agora na comunidade");
  assertEquals(result.accumulatedFields.report_nature, "reclamacao");
});
