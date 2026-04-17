import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { accumulateFieldsFromHistory } from "./lib.ts";

Deno.test("accumulateFieldsFromHistory: confirma categoria pendente no fluxo urbano", () => {
  const progressPayload = {
    description: "Há lixo acumulado há dias na rua.",
    _pending_category: "lixo",
    _pending_subcategory: "acumulo de resíduos",
  };

  const fields = accumulateFieldsFromHistory(
    [
      {
        role: "assistant",
        content: `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(progressPayload)}][FIELD_REQUEST:category]Posso registrar como lixo?`,
      },
      { role: "user", content: "sim" },
    ],
    "urban_report",
  );

  assertEquals(fields.category, "lixo");
  assertEquals(fields.subcategory, "acumulo de resíduos");
  assertEquals(fields._pending_category, undefined);
});

Deno.test("accumulateFieldsFromHistory: captura endereço livre quando o cidadão responde rua e bairro", () => {
  const fields = accumulateFieldsFromHistory(
    [
      { role: "assistant", content: "Qual o CEP? Se não souber, me diz a rua e bairro." },
      { role: "user", content: "Rua das Flores, Centro" },
    ],
    "urban_report",
  );

  assertEquals(fields.street, "Rua das Flores");
  assertEquals(fields.neighborhood, "Centro");
});
