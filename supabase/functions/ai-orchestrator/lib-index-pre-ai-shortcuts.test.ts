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

Deno.test("handlePreAiShortcuts oferece seletor de localização (não só CEP) para busca próxima de serviço", async () => {
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
  assertEquals(text.includes("[FIELD_REQUEST:location_method]"), true);
  assertEquals(text.includes("[LOCATION_METHOD_PICKER]"), true);
  assertEquals(text.includes("Como você quer informar sua localização?"), true);
  assertEquals(text.includes("Qual é o CEP da sua região?"), false);
});

Deno.test("handlePreAiShortcuts: plural feminino 'UBSs mais próximas da minha localização' entra no atalho de serviços", async () => {
  // Antes, o regex de proximidade só casava "próximo(s)" → "próximas" caía na LLM (UX/GPS
  // inconsistente). Deve entrar no atalho determinístico e oferecer o seletor de localização.
  const msg = "Quais são as UBSs mais próximas da minha localização?";
  const result = await handlePreAiShortcuts({
    accumulatedFields: {},
    chatMessages: [{ role: "user", content: msg }],
    collectionIntent: { type: "general", fields: {} },
    lastAssistantMessage: "",
    lastUserMessage: msg,
    lightJourneyMarker: "[LIGHT_JOURNEY:general]",
    msgLower: msg.toLowerCase(),
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
  assertEquals(text.includes("[LOCATION_METHOD_PICKER]"), true);
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
  assertEquals(text.includes("156"), false); // NREF018: não encaminha para o 156/Prefeitura
  // NÃO pode inventar endereço/telefone:
  assertEquals(/\d{4,5}-?\d{4}/.test(text), false); // sem telefone inventado
  assertEquals(/rua|avenida|av\./i.test(text), false); // sem endereço inventado
});

Deno.test("handlePreAiShortcuts: seleção de UBS no fluxo de avaliação NÃO é sequestrada pela guarda de serviço nomeado", async () => {
  let calledNameLookup = false;
  // Bolha enviada ao escolher na lista do passo "Qual UBS você visitou?": carrega
  // [SERVICE_ID:<uuid>] e deve ser resolvida pelo service_id, não por busca textual.
  // Regressão de bug-2026-06-08-avaliacao-de-servico-ubs-selecionada-na-lista-retorna-nao-encontrei.
  const pick =
    "Serviço: UBS BUTANTÃ - VL GOMES Endereço: R. CABRAL DE MENEZES, 51 [SERVICE_ID:1c27b05d-4c83-461b-954d-43cefbae5492]";
  const result = await handlePreAiShortcuts({
    accumulatedFields: { service_type: "ubs" },
    chatMessages: [
      { role: "assistant", content: "Qual UBS você visitou em Butantã? Selecione na lista abaixo. [SERVICE_PICKER]" },
      { role: "user", content: pick },
    ],
    collectionIntent: { type: "service_rating", fields: { service_type: "ubs" } },
    lastAssistantMessage: "Qual UBS você visitou em Butantã? Selecione na lista abaixo. [SERVICE_PICKER]",
    lastUserMessage: pick,
    lightJourneyMarker: "",
    msgLower: pick.toLowerCase(),
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      getServiceAddressByName: async () => {
        calledNameLookup = true;
        return null;
      },
      inferServiceTypeFromText: () => "ubs",
      isBusInformationalQuery: () => false,
    } as any,
  });

  // A guarda de serviço nomeado NÃO deve rodar (nem por nome) → segue o fluxo de coleta.
  assertEquals(calledNameLookup, false);
  assertEquals(result.response, undefined);
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

Deno.test("handlePreAiShortcuts: telefone de vereador → dado REAL da lista oficial (anti-alucinação)", async () => {
  const result = await handlePreAiShortcuts({
    accumulatedFields: {},
    chatMessages: [{ role: "user", content: "qual o telefone do vereador Eduardo Suplicy?" }],
    collectionIntent: null,
    lastAssistantMessage: "",
    lastUserMessage: "qual o telefone do vereador Eduardo Suplicy?",
    lightJourneyMarker: "",
    msgLower: "qual o telefone do vereador eduardo suplicy?",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      fetchVereadorRecords: async () => [
        { name: "Eduardo Suplicy", party: "PT", phone: "(11) 3396-4000" },
        { name: "Erika Hilton", party: "PSOL", phone: "(11) 3396-4321" },
      ],
      inferServiceTypeFromText: () => null,
      isBusInformationalQuery: () => false,
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("Eduardo Suplicy"), true);
  assertEquals(text.includes("(11) 3396-4000"), true);
});

Deno.test("handlePreAiShortcuts: vereador inexistente → honesto, sem inventar contato", async () => {
  const result = await handlePreAiShortcuts({
    accumulatedFields: {},
    chatMessages: [{ role: "user", content: "qual o e-mail do vereador Fulano de Tal?" }],
    collectionIntent: null,
    lastAssistantMessage: "",
    lastUserMessage: "qual o e-mail do vereador Fulano de Tal?",
    lightJourneyMarker: "",
    msgLower: "qual o e-mail do vereador fulano de tal?",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      corsHeaders: {},
      fetchVereadorRecords: async () => [{ name: "Eduardo Suplicy", party: "PT", phone: "(11) 3396-4000" }],
      inferServiceTypeFromText: () => null,
      isBusInformationalQuery: () => false,
    } as any,
  });

  assertExists(result.response);
  const text = await result.response!.text();
  assertEquals(text.includes("Não encontrei"), true);
  assertEquals(text.includes("/institucional/vereadores"), true);
  // nada de e-mail/telefone inventado:
  assertEquals(text.includes("@"), false);
  assertEquals(/\(11\)\s*\d{4}-?\d{4}/.test(text), false);
});

Deno.test("handlePreAiShortcuts: horário de serviço → endereço real + honesto sobre não ter horário", async () => {
  const real = "UBS Vila Maria - Dr. Luiz Paulo Gnecco\n📍 R. André da Fonseca, 70, Vila Munhoz\n📞 3475-5203";
  const result = await handlePreAiShortcuts({
    accumulatedFields: {},
    chatMessages: [{ role: "user", content: "qual o horário da UBS Vila Maria?" }],
    collectionIntent: null,
    lastAssistantMessage: "",
    lastUserMessage: "qual o horário da UBS Vila Maria?",
    lightJourneyMarker: "",
    msgLower: "qual o horário da ubs vila maria?",
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
  assertEquals(text.includes("R. André da Fonseca, 70"), true); // endereço real (não inventado)
  assertEquals(text.includes("horário de funcionamento"), true); // honesto sobre não ter
  assertEquals(text.includes("156"), false); // NREF018: não encaminha para o 156/Saúde SP
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
