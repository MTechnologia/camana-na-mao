import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  answerHasHighRiskFactualData,
  sanitizeUngroundedFactualAnswer,
  UNGROUNDED_FACTUAL_REPLY,
} from "./lib-factual-guard.ts";

Deno.test("answerHasHighRiskFactualData: detecta telefone com DDD, celular, e-mail, CEP e endereço", () => {
  assertEquals(answerHasHighRiskFactualData("Ligue (11) 3742-8350"), true);
  assertEquals(answerHasHighRiskFactualData("Whatsapp 91234-5678"), true);
  assertEquals(answerHasHighRiskFactualData("Escreva para fulano@cmsp.sp.gov.br"), true);
  assertEquals(answerHasHighRiskFactualData("CEP 01310-100"), true);
  assertEquals(answerHasHighRiskFactualData("Fica na Rua André da Fonseca, 70"), true);
});

Deno.test("answerHasHighRiskFactualData: NÃO confunde intervalo de ano nem 156 com telefone", () => {
  assertEquals(answerHasHighRiskFactualData("entre 2020-2024 houve avanços"), false);
  assertEquals(answerHasHighRiskFactualData("ligue para a central 156 ou 190"), false);
  assertEquals(answerHasHighRiskFactualData("o site é cmsp.sp.gov.br"), false);
});

Deno.test("sanitizeUngroundedFactualAnswer: substitui resposta livre com dado factual não ancorado", () => {
  const out = sanitizeUngroundedFactualAnswer(
    "A UBS Continental fica na Rua Antenor de Oliveira Carvalho, 20, telefone (11) 3742-8350.",
    { groundingInjected: false },
  );
  assertEquals(out.redacted, true);
  assertEquals(out.text, UNGROUNDED_FACTUAL_REPLY);
});

Deno.test("sanitizeUngroundedFactualAnswer: NÃO mexe quando houve contexto/RAG injetado", () => {
  const txt = "Conforme a base, o telefone da Câmara é (11) 3396-4000.";
  const out = sanitizeUngroundedFactualAnswer(txt, { groundingInjected: true });
  assertEquals(out.redacted, false);
  assertEquals(out.text, txt);
});

Deno.test("sanitizeUngroundedFactualAnswer: NÃO mexe em passo guiado (marcadores de fluxo)", () => {
  const txt = "[FIELD_REQUEST:cep]Qual seu CEP? Ex.: 01310-100 [ADDRESS_PICKER]";
  const out = sanitizeUngroundedFactualAnswer(txt, { groundingInjected: false });
  assertEquals(out.redacted, false);
  assertEquals(out.text, txt);
});

Deno.test("sanitizeUngroundedFactualAnswer: passa resposta normal sem dado de risco", () => {
  const txt = "A Câmara fiscaliza o Executivo, aprova leis e realiza audiências públicas.";
  const out = sanitizeUngroundedFactualAnswer(txt, { groundingInjected: false });
  assertEquals(out.redacted, false);
  assertEquals(out.text, txt);
});
