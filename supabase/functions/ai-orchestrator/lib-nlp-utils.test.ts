import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  extractImplicitData,
  isAffirmativeResponse,
  isGenericIntentText,
  isNegativeResponse,
  isValidDomainDescription,
} from "./lib-nlp-utils.ts";

Deno.test("nlp utils: reconhece respostas afirmativas e negativas", () => {
  assertEquals(isAffirmativeResponse("pode sim"), true);
  assertEquals(isNegativeResponse("deixa pra lá"), true);
});

Deno.test("nlp utils: filtra intenção genérica e aceita descrição curta válida", () => {
  assertEquals(isGenericIntentText("quero falar sobre a cidade"), true);
  assertEquals(isValidDomainDescription("Poste apagado", "urban"), true);
  assertEquals(isValidDomainDescription("quero relatar um problema", "urban"), false);
});

Deno.test("extractImplicitData: infere risco e horário em contexto", () => {
  const risk = extractImplicitData("sim, muito perigoso", "Isso apresenta risco ou urgência?", "urban");
  const time = extractImplicitData("foi hoje de manhã", "Quando aconteceu?", "transport");

  assertEquals(risk.risk_level, "critical");
  assertEquals(time.occurrence_time, "08:00");
  assertEquals(time.occurrence_date, new Date().toISOString().split("T")[0]);
});
