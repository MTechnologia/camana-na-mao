import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  extractChamberFields,
  findCouncilMemberMatches,
  isChamberIntentOrSelectionText,
} from "./lib-chamber-feedback.ts";

Deno.test("isChamberIntentOrSelectionText: frases-gatilho/seleção NÃO são mensagem de feedback", () => {
  for (
    const t of [
      "Quero falar sobre um vereador",
      "quero falar sobre o vereador",
      "feedback sobre um vereador",
      "Vereador(a): Milton Leite (UNIÃO)",
      "Elogio",
    ]
  ) {
    assertEquals(isChamberIntentOrSelectionText(t), true, `deveria ser intenção/seleção: "${t}"`);
  }
});

Deno.test("isChamberIntentOrSelectionText: mensagem real de elogio é aceita (não é gatilho)", () => {
  for (
    const t of [
      "Excelente atuação na área da saúde, sempre presente no bairro",
      "Parabéns pelo projeto de lei das ciclovias, fez muita diferença na minha região",
      "Gostei muito do trabalho dele na fiscalização das obras da praça",
    ]
  ) {
    assertEquals(isChamberIntentOrSelectionText(t), false, `deveria ser mensagem real: "${t}"`);
  }
});

Deno.test("findCouncilMemberMatches: encontra vereador por nome parcial", () => {
  const result = findCouncilMemberMatches("Suplicy");

  assertEquals(result.found, true);
  assertEquals(result.suggestion, "Eduardo Suplicy (PT)");
});

Deno.test("extractChamberFields: extrai natureza (report_nature) e vereador validado", () => {
  const result = extractChamberFields("Quero elogiar o vereador Eduardo Suplicy pelo atendimento.");

  assertEquals(result, {
    category: "feedback_camara",
    report_nature: "elogio",
    subcategory: "elogio",
    council_member_name: "Eduardo Suplicy",
    council_member_party: "PT",
  });
});

Deno.test("extractChamberFields: mapeia verbo → report_nature (reclamar/sugerir) p/ pular a pergunta de tipo", () => {
  assertEquals(extractChamberFields("Quero reclamar de um vereador").report_nature, "reclamacao");
  assertEquals(extractChamberFields("Quero fazer uma sugestão a um vereador").report_nature, "sugestao");
  // sem verbo de natureza, não força report_nature (o tipo será perguntado)
  assertEquals(extractChamberFields("Quero dar um feedback sobre um vereador").report_nature, undefined);
});

Deno.test("extractChamberFields: NÃO captura a natureza ('elogio') como nome do vereador (mantém o picker)", () => {
  // Regressão: o fullUserContext "...vereador elogio" fazia o regex capturar "elogio"
  // como council_member_name, suprimindo o [VEREADOR_PICKER] e gerando relato sem vereador.
  for (const word of ["elogio", "reclamação", "sugestao"]) {
    const result = extractChamberFields(`quero falar sobre um vereador ${word}`);
    assertEquals(result.council_member_name, undefined, `não deveria capturar "${word}" como nome`);
    assertEquals(result._ambiguous_name, undefined);
    assertEquals(result._possible_matches, undefined);
  }
});

Deno.test("extractChamberFields: nome inexistente NÃO é setado como vereador (picker pedirá a seleção)", () => {
  const result = extractChamberFields("Quero elogiar o vereador Fulano de Tal");
  assertEquals(result.council_member_name, undefined);
  assertEquals(result.report_nature, "elogio");
});
