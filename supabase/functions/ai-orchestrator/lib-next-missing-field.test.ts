import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { getNextMissingField } from "./lib-next-missing-field.ts";

const mockSupabase = {
  from() {
    return {
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({ data: [] }),
          }),
          maybeSingle: async () => ({ data: null }),
        }),
      }),
    };
  },
};

Deno.test("getNextMissingField pede natureza no relato urbano", async () => {
  const result = await getNextMissingField(
    "urban_report",
    {},
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    "user-1",
    {
      URBAN_REPORT_NATURE_VALUES: ["reclamacao", "duvida", "sugestao", "elogio"],
    // deno-lint-ignore no-explicit-any
    } as any,
  );

  assertEquals(result.field, "report_nature");
});

Deno.test("getNextMissingField: feedback_camara pergunta PRIMEIRO o vereador (seletor oficial)", async () => {
  const result = await getNextMissingField(
    "urban_report",
    { category: "feedback_camara" },
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    "user-1",
    {
      URBAN_REPORT_NATURE_VALUES: ["reclamacao", "duvida", "sugestao", "elogio"],
      // deno-lint-ignore no-explicit-any
    } as any,
  );

  assertEquals(result.field, "council_member_name");
  assertEquals(result.prompt?.includes("[VEREADOR_PICKER]"), true);
});

Deno.test("getNextMissingField: feedback_camara pede natureza com 3 opções (sem 'duvida') após o vereador", async () => {
  const result = await getNextMissingField(
    "urban_report",
    { category: "feedback_camara", council_member_name: "Eduardo Suplicy" },
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    "user-1",
    {
      URBAN_REPORT_NATURE_VALUES: ["reclamacao", "duvida", "sugestao", "elogio"],
      // deno-lint-ignore no-explicit-any
    } as any,
  );

  assertEquals(result.field, "report_nature");
  assertEquals(result.prompt?.includes("[QUICK_REPLY:reclamacao,sugestao,elogio]"), true);
  assertEquals(result.prompt?.includes("duvida"), false);
  assertEquals(result.prompt?.toLowerCase().includes("vereador"), true);
});

Deno.test("getNextMissingField: 'elogiar vereador' com natureza já preenchida NÃO pergunta o tipo de novo", async () => {
  // report_nature vem de extractChamberFields ("elogiar" → elogio); com o vereador
  // escolhido, o fluxo deve pular a pergunta de tipo e ir para a mensagem.
  const result = await getNextMissingField(
    "urban_report",
    { category: "feedback_camara", council_member_name: "Eduardo Suplicy", report_nature: "elogio" },
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    "user-1",
    {
      URBAN_REPORT_NATURE_VALUES: ["reclamacao", "duvida", "sugestao", "elogio"],
      isBareUrbanReportNatureReply: () => false,
      isValidUrbanReportDescription: () => false,
      // deno-lint-ignore no-explicit-any
    } as any,
  );

  assertEquals(result.field, "description"); // pede a mensagem, NÃO o tipo
  assertEquals(result.prompt?.includes("[QUICK_REPLY:reclamacao"), false);
  assertEquals(result.prompt?.toLowerCase().includes("elogiar"), true);
});

Deno.test("getNextMissingField: feedback_camara não pede localização (pula CEP/endereço) e conclui", async () => {
  const accumulated: Record<string, unknown> = {
    report_nature: "reclamacao",
    description: "O vereador não respondeu meus pedidos sobre a praça do bairro",
    category: "feedback_camara",
    subcategory: "Feedback: Amanda Paschoal",
    council_member_name: "Amanda Paschoal",
  };
  const result = await getNextMissingField(
    "urban_report",
    accumulated,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    "user-1",
    {
      URBAN_REPORT_NATURE_VALUES: ["reclamacao", "duvida", "sugestao", "elogio"],
      URBAN_RISK_COLLECTION_CATEGORIES: ["via_publica"],
      isBareUrbanReportNatureReply: () => false,
      isValidUrbanReportDescription: () => true,
      applyUrbanNatureCategoryDefaults: () => {},
      generateLabelFromDescription: (d: string) => d,
      isCitySaoPaulo: () => true,
      // mesmo com reclamação (que normalmente pede local), feedback_camara pula
      urbanNatureSkipsLocationCollection: () => false,
      // deno-lint-ignore no-explicit-any
    } as any,
  );

  // Não deve pedir location_method/cep — conclui direto para criação
  assertEquals(result.field, null);
  assertEquals(result.picker, null);
});

Deno.test("getNextMissingField não pergunta gravidade quando descrição não dá pistas (default low) e segue pedindo afetação", async () => {
  const accumulated: Record<string, unknown> = {
    report_nature: "reclamacao",
    description: "Existe um buraco na minha rua",
    category: "via_publica",
    subcategory: "Buraco na Via",
    location_method: "registered_address",
    _location_from_user_profile: true,
    urban_registered_address_ack: true,
    street: "Avenida Lineu de Paula Machado",
    street_number: "1477",
    neighborhood: "Jardim Everest",
    cep: "05601001",
    city: "São Paulo",
  };
  const result = await getNextMissingField(
    "urban_report",
    accumulated,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    "user-1",
    {
      URBAN_REPORT_NATURE_VALUES: ["reclamacao", "duvida", "sugestao", "elogio"],
      URBAN_RISK_COLLECTION_CATEGORIES: ["via_publica"],
      isGenericIntentText: () => false,
      isBareUrbanReportNatureReply: () => false,
      isValidDomainDescription: () => true,
      isValidUrbanReportDescription: (_text: string, _nature?: string) => true,
      applyUrbanNatureCategoryDefaults: () => {},
      generateLabelFromDescription: (d: string) => d,
      isCitySaoPaulo: () => true,
      urbanNatureSkipsLocationCollection: () => false,
      autoInferRisk: () => ({ risk_level: null, confidence: 0 }),
      // deno-lint-ignore no-explicit-any
    } as any,
  );

  assertEquals(accumulated.risk_level, "low");
  assertEquals(accumulated._risk_default_low, true);
  assertEquals(result.field, "affected_scope");
  assertEquals(result.prompt?.includes("[FIELD_REQUEST:affected_scope]"), true);
});

Deno.test("getNextMissingField pede localização na jornada leve de serviços", async () => {
  const result = await getNextMissingField(
    "services",
    {},
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    "user-1",
    // deno-lint-ignore no-explicit-any
    {} as any,
  );

  assertEquals(result, {
    field: "location_method",
    picker: "[LOCATION_METHOD_PICKER]",
    prompt:
      "[FIELD_REQUEST:location_method]Como você quer informar sua localização para buscar serviços próximos?",
  });
});

Deno.test("getNextMissingField pede frequência antes de concluir transporte", async () => {
  const fields: Record<string, unknown> = {
    description: "ônibus atrasou muito na linha",
    report_type: "atraso",
    sub_category: "atraso_recorrente",
    line_code: "1017-10",
    occurrence_date: "2026-05-29",
    occurrence_time: "07:32",
    direction: "ida",
    _stop_name_skipped: true,
    _stop_location_skipped: true,
  };
  const result = await getNextMissingField(
    "transport_report",
    fields,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    "user-1",
    {
      isGenericIntentText: () => false,
      isValidDomainDescription: () => true,
      getClassificationFromFeedback: async () => null,
      inferTransportTypeFromText: () => null,
      extractTransportFields: () => ({}),
      isValidTransportSubcategory: () => true,
      // deno-lint-ignore no-explicit-any
    } as any,
  );
  assertEquals(result.field, "recurrence_frequency");
});

Deno.test("getNextMissingField não pede stop_name/stop_location quando usuário pulou", async () => {
  const fields: Record<string, unknown> = {
    description: "ônibus atrasado",
    report_type: "atraso",
    sub_category: "atraso_recorrente",
    line_code: "875A",
    _stop_name_skipped: true,
    _stop_location_skipped: true,
    occurrence_date: "2026-05-29",
    occurrence_time: "08:30",
    direction: "ida",
    recurrence_frequency: "toda_semana",
    personal_impact: 4,
  };
  const result = await getNextMissingField(
    "transport_report",
    fields,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    "user-1",
    {
      isGenericIntentText: () => false,
      isValidDomainDescription: () => true,
      getClassificationFromFeedback: async () => null,
      inferTransportTypeFromText: () => null,
      extractTransportFields: () => ({}),
      isValidTransportSubcategory: () => true,
      // deno-lint-ignore no-explicit-any
    } as any,
  );
  assertEquals(result.field, null);
});
