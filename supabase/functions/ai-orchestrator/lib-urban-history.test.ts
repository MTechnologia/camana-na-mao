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

Deno.test("accumulateFieldsFromHistory: seleção do picker de vereador marca feedback_camara (sem virar relato urbano com local)", () => {
  const fields = accumulateFieldsFromHistory(
    [
      { role: "user", content: "Quero dar um feedback sobre um vereador" },
      { role: "assistant", content: "Sobre qual vereador você quer falar? [VEREADOR_PICKER]" },
      { role: "user", content: "Vereador(a): Amanda Paschoal (PSOL)" },
    ],
    "urban_report",
  );

  assertEquals(fields.category, "feedback_camara");
  assertEquals(fields.council_member_name, "Amanda Paschoal");
  assertEquals(fields.council_member_party, "PSOL");
  // A frase de intenção não pode virar a "descrição" — senão o bot pula a coleta do feedback.
  assertEquals(fields.description, undefined);
});

Deno.test("accumulateFieldsFromHistory: feedback_camara preserva a descrição real do cidadão", () => {
  const fields = accumulateFieldsFromHistory(
    [
      { role: "user", content: "Quero dar um feedback sobre um vereador" },
      { role: "user", content: "Vereador(a): Amanda Paschoal (PSOL)" },
      {
        role: "user",
        content:
          "A vereadora não respondeu meu ofício sobre a reforma da creche do bairro, já faz meses",
      },
    ],
    "urban_report",
  );

  assertEquals(fields.category, "feedback_camara");
  assertEquals(
    String(fields.description ?? "").includes("creche"),
    true,
  );
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
