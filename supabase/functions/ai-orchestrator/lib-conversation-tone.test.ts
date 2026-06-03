import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  analyzeConversationTone,
  buildConversationToneInstruction,
} from "./lib-conversation-tone.ts";

Deno.test("analyzeConversationTone diferencia palavrão sobre problema de ofensa direta", () => {
  const frustration = analyzeConversationTone("essa rua ta uma merda, tem lixo espalhado");
  assertEquals(frustration.kind, "frustrated");
  assertEquals(frustration.expectedBehavior, "advertir_e_continuar");
  assertEquals(frustration.shouldWarn, true);

  const desgraca = analyzeConversationTone("quero saber a respeito da desgraça da cmsp");
  assertEquals(desgraca.kind, "frustrated");
  assertEquals(desgraca.shouldWarn, true);

  const directOffense = analyzeConversationTone("voces sao incompetentes, o onibus nao passou");
  assertEquals(directOffense.kind, "direct_offense");
  assertEquals(directOffense.expectedBehavior, "advertir_e_continuar");
  assertEquals(directOffense.shouldWarn, true);
});

Deno.test("analyzeConversationTone prioriza risco imediato", () => {
  const result = analyzeConversationTone("tem arma e briga dentro do onibus agora");
  assertEquals(result.kind, "urgent_risk");
  assertEquals(result.expectedBehavior, "orientar_emergencia");
  assertEquals(result.shouldOrientEmergency, true);
});

Deno.test("buildConversationToneInstruction orienta advertir e continuar", () => {
  const analysis = analyzeConversationTone("vc e burro, tem buraco na rua");
  const instruction = buildConversationToneInstruction(analysis);
  assertStringIncludes(instruction, "OFENSA DIRETA");
  assertStringIncludes(instruction, "continue ajudando normalmente");
  assertStringIncludes(instruction, "não encerre a jornada");
});

Deno.test("buildConversationToneInstruction adverte em palavrão de frustração", () => {
  const analysis = analyzeConversationTone("que merda de servico, desgraça");
  const instruction = buildConversationToneInstruction(analysis);
  assertStringIncludes(instruction, "PALAVRÃO");
  assertStringIncludes(instruction, "ressalva curta");
  assertStringIncludes(instruction, "Não encerre a jornada");
});

Deno.test("buildConversationToneInstruction orienta emergencia sem encerrar coleta", () => {
  const analysis = analyzeConversationTone("fio caido com risco de choque na rua");
  const instruction = buildConversationToneInstruction(analysis);
  assertStringIncludes(instruction, "RISCO IMEDIATO");
  assertStringIncludes(instruction, "190, 192 ou 193");
  assertStringIncludes(instruction, "continue a coleta");
});
