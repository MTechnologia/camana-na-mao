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
