import { assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { systemPrompt } from "./lib-prompts.ts";

// Fase 3 (anti-alucinação): garante que a regra de NÃO inventar dados factuais
// está presente no prompt do sistema — é a camada de defesa global (além dos
// guard-rails determinísticos de serviço/vereador).
Deno.test("systemPrompt contém a proibição de inventar dados factuais", () => {
  assertStringIncludes(systemPrompt, "NÃO INVENTAR DADOS FACTUAIS");
  assertStringIncludes(systemPrompt, "NUNCA invente dados factuais");
});

Deno.test("systemPrompt lista os tipos de dado proibidos de inventar", () => {
  for (const termo of ["telefones", "endereços", "datas", "projetos de lei"]) {
    assert(systemPrompt.includes(termo), `prompt deveria mencionar "${termo}"`);
  }
});

Deno.test("systemPrompt manda recorrer ao canal oficial da Câmara, NÃO ao Executivo/156 (NREF018)", () => {
  assertStringIncludes(systemPrompt, "cmsp.sp.gov.br");
  assertStringIncludes(systemPrompt, "não tenho essa informação");
  // NREF018: o canal recomendado é o da Câmara; o prompt instrui a NÃO encaminhar ao Executivo/156.
  assertStringIncludes(systemPrompt, "NÃO encaminhe para canais do Executivo");
});
