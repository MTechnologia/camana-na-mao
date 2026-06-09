import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { buildAccumulatedContext } from "./lib-index-accumulated-context.ts";
import { inferServiceTypeFromText } from "./lib-service-discovery.ts";

function createLibMock(overrides: Record<string, unknown> = {}) {
  return {
    accumulateFieldsFromHistory: () => ({}),
    inferServiceTypeFromText: () => null,
    isBareUrbanReportNatureReply: () => false,
    isGenericIntentText: () => false,
    isValidDomainDescription: () => false,
    lookupCEP: async () => ({ valid: false }),
    messageLooksLikeUrbanIncidentStarter: () => false,
    normalizeReportNature: () => null,
    ...overrides,
  };
}

Deno.test("buildAccumulatedContext: NREF004 — ao trocar p/ service_rating preserva o tipo já dito (CEU)", async () => {
  const result = await buildAccumulatedContext({
    chatHistoryTyped: [
      { role: "user", content: "Quero avaliar o ceu aqui de casa" },
      {
        role: "user",
        content: "[JOURNEY_SWITCHED:service_rating] Sim, quero iniciar Avaliação de Serviço.",
      },
    ],
    chatMessages: [],
    collectionIntent: { type: "service_rating", fields: {} },
    evaluationContext: null,
    journeyDeclined: false,
    journeySwitched: true,
    lastUserMsg: "[JOURNEY_SWITCHED:service_rating] Sim, quero iniciar Avaliação de Serviço.",
    // deno-lint-ignore no-explicit-any
    lib: createLibMock({ inferServiceTypeFromText }) as any,
  });

  assertEquals(result.accumulatedFields.service_type, "ceu");
});

Deno.test("buildAccumulatedContext: NREF005 — ao trocar p/ transporte preserva a descrição já dada (não re-pergunta 'o que aconteceu')", async () => {
  const result = await buildAccumulatedContext({
    chatHistoryTyped: [
      { role: "user", content: "Quero falar sobre a cidade" },
      { role: "user", content: "Reclamação" },
      { role: "user", content: "Todo dia o motorista passa e não para no ponto" },
      {
        role: "user",
        content:
          "Sim, quero iniciar Diagnóstico de Transporte. [JOURNEY_SWITCHED:transport_report]",
      },
    ],
    chatMessages: [],
    collectionIntent: { type: "transport_report", fields: {} },
    evaluationContext: null,
    journeyDeclined: false,
    journeySwitched: true,
    lastUserMsg: "Sim, quero iniciar Diagnóstico de Transporte. [JOURNEY_SWITCHED:transport_report]",
    // deno-lint-ignore no-explicit-any
    lib: createLibMock({
      // valida como descrição de transporte tanto "motorista..." quanto a confirmação
      // ("...Transporte") — provando que a confirmação é IGNORADA pelo marcador, não pela validação.
      isValidDomainDescription: (t: string) => /motorista|transporte/i.test(t),
      isGenericIntentText: (t: string) => /quero falar/i.test(t),
    }) as any,
  });

  assertEquals(
    result.accumulatedFields.description,
    "Todo dia o motorista passa e não para no ponto",
  );
});

Deno.test("buildAccumulatedContext: troca sem tipo mencionado não inventa service_type", async () => {
  const result = await buildAccumulatedContext({
    chatHistoryTyped: [
      { role: "user", content: "[JOURNEY_SWITCHED:service_rating] Sim, quero iniciar Avaliação de Serviço." },
    ],
    chatMessages: [],
    collectionIntent: { type: "service_rating", fields: {} },
    evaluationContext: null,
    journeyDeclined: false,
    journeySwitched: true,
    lastUserMsg: "[JOURNEY_SWITCHED:service_rating] Sim, quero iniciar Avaliação de Serviço.",
    // deno-lint-ignore no-explicit-any
    lib: createLibMock({ inferServiceTypeFromText }) as any,
  });

  assertEquals(result.accumulatedFields.service_type, undefined);
});

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
  assertEquals(result.journeySnapshot?.schema_version, "journey_snapshot.v1");
  assertEquals(result.journeySnapshot?.journey_type, "service_rating");
  assertEquals(result.journeySnapshot?.fields.service_type, "ubs");
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
  assertEquals(result.journeySnapshot?.journey_type, "urban_report");
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
  assertEquals(result.journeySnapshot?.journey_type, "general");
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
  assertEquals(result.journeySnapshot?.journey_type, "urban_report");
});
