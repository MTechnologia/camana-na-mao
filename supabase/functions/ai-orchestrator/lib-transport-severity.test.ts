import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { applyPersonalImpactToSeverity } from "./lib-transport-severity.ts";

Deno.test("applyPersonalImpactToSeverity: eleva severidade conforme impacto pessoal", () => {
  assertEquals(applyPersonalImpactToSeverity("baixa", 2), "baixa");
  assertEquals(applyPersonalImpactToSeverity("baixa", 3), "media");
  assertEquals(applyPersonalImpactToSeverity("media", 4), "alta");
  assertEquals(applyPersonalImpactToSeverity("media", 5), "critica");
  assertEquals(applyPersonalImpactToSeverity("alta", 5), "critica");
});
