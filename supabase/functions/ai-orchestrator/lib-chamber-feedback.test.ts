import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { extractChamberFields, findCouncilMemberMatches } from "./lib-chamber-feedback.ts";

Deno.test("findCouncilMemberMatches: encontra vereador por nome parcial", () => {
  const result = findCouncilMemberMatches("Suplicy");

  assertEquals(result.found, true);
  assertEquals(result.suggestion, "Eduardo Suplicy (PT)");
});

Deno.test("extractChamberFields: extrai subcategoria e vereador validado", () => {
  const result = extractChamberFields("Quero elogiar o vereador Eduardo Suplicy pelo atendimento.");

  assertEquals(result, {
    category: "feedback_camara",
    subcategory: "elogio",
    council_member_name: "Eduardo Suplicy",
    council_member_party: "PT",
  });
});
