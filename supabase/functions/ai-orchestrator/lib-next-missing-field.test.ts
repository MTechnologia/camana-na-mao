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
      isCitySaoPaulo: () => true,
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
