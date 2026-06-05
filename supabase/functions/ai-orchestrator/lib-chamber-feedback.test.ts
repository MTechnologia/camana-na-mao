import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { extractChamberFields, findCouncilMemberMatches } from "./lib-chamber-feedback.ts";

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
