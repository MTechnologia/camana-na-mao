import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getMessageText, handlePreAiShortcuts } from "./lib-index-pre-ai-shortcuts.ts";

Deno.test("getMessageText extrai texto de content estruturado", () => {
  assertEquals(
    getMessageText({
      content: [{ type: "text", text: "oi" }],
    }),
    "oi",
  );
});

Deno.test("handlePreAiShortcuts retorna picker no primeiro 'como chegar'", async () => {
  const result = await handlePreAiShortcuts({
    accumulatedFields: {},
    chatMessages: [{ role: "user", content: "como chegar na câmara municipal?" }],
    collectionIntent: null,
    lastAssistantMessage: "",
    lastUserMessage: "como chegar na câmara municipal?",
    lightJourneyMarker: "",
    msgLower: "como chegar na câmara municipal?",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: { corsHeaders: {} } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("[FIELD_REQUEST:location_method]"), true);
  assertEquals(text.includes("[LOCATION_METHOD_PICKER]"), true);
});

Deno.test("handlePreAiShortcuts encaminha avaliação para vereador", async () => {
  let suggestionArgs: { description: string; issueType: string } | null = null;

  const result = await handlePreAiShortcuts({
    accumulatedFields: {},
    chatMessages: [
      { role: "assistant", content: "[RATING_CREATED:1]\n**Serviço:** UBS Centro\n**Comentário:** Atendimento lento" },
      { role: "user", content: "Quero encaminhar minha avaliação para um vereador" },
    ],
    collectionIntent: { type: "service_rating", fields: {} },
    lastAssistantMessage: "[RATING_CREATED:1]\n**Serviço:** UBS Centro\n**Comentário:** Atendimento lento",
    lastUserMessage: "Quero encaminhar minha avaliação para um vereador",
    lightJourneyMarker: "",
    msgLower: "quero encaminhar minha avaliação para um vereador",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      suggestCouncilMember: async (issueType: string, description: string) => {
        suggestionArgs = { description, issueType };
        return "Vereador Exemplo";
      },
    } as any,
  });

  assertExists(result.response);
  assertEquals(suggestionArgs?.issueType, "urbanismo");
  assertEquals(suggestionArgs?.description.includes("UBS Centro"), true);
  const text = await result.response!.text();
  assertEquals(text.includes("Vereador Exemplo"), true);
});

Deno.test("handlePreAiShortcuts pede CEP cedo para busca próxima de serviço", async () => {
  const result = await handlePreAiShortcuts({
    accumulatedFields: {},
    chatMessages: [{ role: "user", content: "qual UBS mais perto de mim?" }],
    collectionIntent: { type: "general", fields: {} },
    lastAssistantMessage: "",
    lastUserMessage: "qual UBS mais perto de mim?",
    lightJourneyMarker: "[LIGHT_JOURNEY:general]",
    msgLower: "qual ubs mais perto de mim?",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      getServiceTypeName: () => "UBS",
      inferServiceTypeFromText: () => "ubs",
      isBusInformationalQuery: () => false,
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("[COLLECTION_PROGRESS:services:"), true);
  assertEquals(text.includes("Qual é o CEP da sua região?"), true);
});

Deno.test("handlePreAiShortcuts: 'E a UBS Continental?' fora de SP → não inventa, responde honesto (anti-alucinação)", async () => {
  let askedTerm = "";
  const result = await handlePreAiShortcuts({
    accumulatedFields: { report_nature: "duvida" },
    chatMessages: [{ role: "user", content: "E a UBS Continental?" }],
    collectionIntent: { type: "urban_report", fields: {} },
    lastAssistantMessage: "",
    lastUserMessage: "E a UBS Continental?",
    lightJourneyMarker: "",
    msgLower: "e a ubs continental?",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      getServiceAddressByName: async (_s: unknown, term: string) => {
        askedTerm = term;
        return null; // não existe em São Paulo (é de Guarulhos)
      },
      inferServiceTypeFromText: () => "ubs",
      isBusInformationalQuery: () => false,
    } as any,
  });

  assertExists(result.response);
  assertEquals(askedTerm, "ubs continental");
  const text = await result.response!.text();
  assertEquals(text.includes("Não encontrei"), true);
  assertEquals(text.includes("São Paulo"), true);
  assertEquals(text.includes("156"), true);
  // NÃO pode inventar endereço/telefone:
  assertEquals(/\d{4,5}-?\d{4}/.test(text), false); // sem telefone inventado
  assertEquals(/rua|avenida|av\./i.test(text), false); // sem endereço inventado
});

Deno.test("handlePreAiShortcuts: 'Onde fica a UBS Vila Maria?' → endereço REAL do public_services", async () => {
  const real = "UBS Vila Maria - Dr. Luiz Paulo Gnecco\n📍 R. André da Fonseca, 70, Vila Munhoz\n📞 3475-5203";
  const result = await handlePreAiShortcuts({
    accumulatedFields: {},
    chatMessages: [{ role: "user", content: "Onde fica a UBS Vila Maria?" }],
    collectionIntent: null,
    lastAssistantMessage: "",
    lastUserMessage: "Onde fica a UBS Vila Maria?",
    lightJourneyMarker: "",
    msgLower: "onde fica a ubs vila maria?",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      getServiceAddressByName: async () => real,
      inferServiceTypeFromText: () => "ubs",
      isBusInformationalQuery: () => false,
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("R. André da Fonseca, 70"), true);
  assertEquals(text.includes("base de serviços públicos de São Paulo"), true);
});

Deno.test("handlePreAiShortcuts monta rota após lista de serviços usando coordenadas acumuladas", async () => {
  const result = await handlePreAiShortcuts({
    accumulatedFields: { user_lat: -23.5, user_lon: -46.6 },
    chatMessages: [
      { role: "assistant", content: "Aqui estão as opções mais próximas de você. Quer que eu calcule a rota?" },
      { role: "user", content: "rota para CEU Butantã | Rua Exemplo, 10" },
    ],
    collectionIntent: { type: "services", fields: {} },
    lastAssistantMessage: "Aqui estão as opções mais próximas de você. Quer que eu calcule a rota?",
    lastUserMessage: "rota para CEU Butantã | Rua Exemplo, 10",
    lightJourneyMarker: "[LIGHT_JOURNEY:services]",
    msgLower: "rota para ceu butantã | rua exemplo, 10",
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      buildGoogleMapsDirectionsUrl: (lat: number, lon: number, destination: string) =>
        `https://maps.example.com/?lat=${lat}&lon=${lon}&dest=${encodeURIComponent(destination)}`,
      corsHeaders: {},
      inferServiceTypeFromText: () => null,
      isBusInformationalQuery: () => false,
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("Abrir no Google Maps"), true);
  assertEquals(text.includes("Rua Exemplo, 10"), true);
});
