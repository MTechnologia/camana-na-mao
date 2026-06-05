import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  compactFieldPrompt,
  URBAN_AFFECTED_SCOPE_FIELD_PROMPT,
  URBAN_RISK_LEVEL_FIELD_PROMPT,
} from "./lib-prompt-ux.ts";

Deno.test("compactFieldPrompt mantém FIELD_REQUEST e pickers", () => {
  const prompt =
    "[FIELD_REQUEST:location_method]Como você quer informar onde fica o problema? Você pode usar GPS, endereço cadastrado ou digitar CEP/endereço com detalhes.[LOCATION_METHOD_PICKER]";
  const compact = compactFieldPrompt(prompt);
  assertEquals(compact.includes("[FIELD_REQUEST:location_method]"), true);
  assertEquals(compact.includes("[LOCATION_METHOD_PICKER]"), true);
});

Deno.test("compactFieldPrompt reduz corpo para até duas frases", () => {
  const prompt =
    "[FIELD_REQUEST:description]Primeira frase de orientação. Segunda frase de apoio ao usuário. Terceira frase longa que não deve permanecer no resultado final.";
  const compact = compactFieldPrompt(prompt);
  assertEquals(compact.includes("Primeira frase de orientação."), true);
  assertEquals(compact.includes("Segunda frase de apoio ao usuário."), true);
  assertEquals(compact.includes("Terceira frase longa"), false);
});

Deno.test("compactFieldPrompt NÃO corta endereço em abreviações (Av., Eng., R.)", () => {
  // Regressão NREF003: confirmação cortava em "...Av. Eng." porque o ponto das
  // abreviações era tratado como fim de frase.
  const prompt =
    "[FIELD_REQUEST:service_address_confirmed]O serviço fica em CEU Butantã – Av. Eng. Heitor Antônio Eiras Garcia, 1870 - Jardim Esmeralda. Está correto? [SERVICE_ADDRESS_CONFIRM:x]";
  const compact = compactFieldPrompt(prompt);
  assertEquals(compact.includes("Av. Eng. Heitor Antônio Eiras Garcia, 1870"), true);
  assertEquals(compact.includes("Jardim Esmeralda"), true);
  assertEquals(compact.includes("Está correto?"), true);
  assertEquals(compact.includes("[FIELD_REQUEST:service_address_confirmed]"), true);
});

Deno.test("prompts urbanos de risco e escopo incluem chips QUICK_REPLY", () => {
  assertEquals(URBAN_RISK_LEVEL_FIELD_PROMPT.includes("[QUICK_REPLY:critical,moderate,low,none]"), true);
  assertEquals(
    URBAN_AFFECTED_SCOPE_FIELD_PROMPT.includes("[QUICK_REPLY:somente eu,toda a rua,bairro todo]"),
    true,
  );
});
