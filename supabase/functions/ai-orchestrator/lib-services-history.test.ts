import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { accumulateFieldsFromHistory } from "./lib.ts";

Deno.test("accumulateFieldsFromHistory: acumula endereço, tipo e filtros na jornada services", () => {
  const fields = accumulateFieldsFromHistory(
    [
      {
        role: "assistant",
        content: '[COLLECTION_PROGRESS:services:{"location_method":"manual"}]',
      },
      {
        role: "user",
        content: "Endereço selecionado: Rua das Flores - Centro, São Paulo - CEP: 01000-000",
      },
      {
        role: "user",
        content: "Tipo de serviço: UBS",
      },
      {
        role: "user",
        content: "Raio: 2 km. Avaliação mínima: 4. Busca: pediatria",
      },
    ],
    "services",
  );

  assertEquals(fields.location_method, "manual");
  assertEquals(fields.street, "Rua das Flores");
  assertEquals(fields.neighborhood, "Centro");
  assertEquals(fields.cep, "01000000");
  assertEquals(fields.service_type, "ubs");
  assertEquals(fields.radius_meters, 2000);
  assertEquals(fields.min_rating, 4);
  assertEquals(fields.search_query, "pediatria");
});

Deno.test("accumulateFieldsFromHistory: usa escolha numerada da lista de services", () => {
  const fields = accumulateFieldsFromHistory(
    [
      {
        role: "assistant",
        content: "Qual desses te interessa?\n1. Parques\n2. UBS\n3. Museus",
      },
      {
        role: "user",
        content: "1",
      },
    ],
    "services",
  );

  assertEquals(fields.service_type, "park");
});

Deno.test("accumulateFieldsFromHistory: marca referência não informada quando o usuário pula número", () => {
  const fields = accumulateFieldsFromHistory(
    [
      {
        role: "assistant",
        content: "Pode me passar o número ou um ponto de referência?",
      },
      {
        role: "user",
        content: "sem número",
      },
    ],
    "services",
  );

  assertEquals(fields.reference_point, "não informado");
});
