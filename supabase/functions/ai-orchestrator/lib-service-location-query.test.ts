import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  detectNamedServiceLocationQuery,
  extractServiceSearchTerm,
  prettyServiceName,
} from "./lib-service-location-query.ts";

Deno.test("extractServiceSearchTerm: limpa pergunta e corrige usb→ubs", () => {
  assertEquals(extractServiceSearchTerm("Onde fica a usb vila maria"), "ubs vila maria");
  assertEquals(extractServiceSearchTerm("Onde fica a UBS Vila Maria?"), "ubs vila maria");
  assertEquals(extractServiceSearchTerm("endereço do hospital das clínicas"), "hospital clínicas");
});

Deno.test("detectNamedServiceLocationQuery: pega 'Onde fica a UBS Vila Maria?'", () => {
  const r = detectNamedServiceLocationQuery("Onde fica a UBS Vila Maria?");
  assertEquals(r?.serviceType, "ubs");
  assertEquals(r?.term, "ubs vila maria");
});

Deno.test("detectNamedServiceLocationQuery: pega o follow-up 'E a UBS Continental?' (typo usb tolerado)", () => {
  assertEquals(detectNamedServiceLocationQuery("E a UBS Continental?")?.term, "ubs continental");
  assertEquals(detectNamedServiceLocationQuery("e a usb continental")?.serviceType, "ubs");
});

Deno.test("detectNamedServiceLocationQuery: ignora 'mais perto' sem nome (vai pelo fluxo de proximidade)", () => {
  assertEquals(detectNamedServiceLocationQuery("qual a UBS mais perto de mim?"), null);
  assertEquals(detectNamedServiceLocationQuery("onde tem hospital perto"), null);
});

Deno.test("detectNamedServiceLocationQuery: pega telefone de serviço nomeado (wantsHours=false)", () => {
  const r = detectNamedServiceLocationQuery("qual o telefone da UBS Vila Maria?");
  assertEquals(r?.term, "ubs vila maria");
  assertEquals(r?.wantsHours, false);
});

Deno.test("detectNamedServiceLocationQuery: marca wantsHours e limpa termo em perguntas de horário", () => {
  assertEquals(detectNamedServiceLocationQuery("qual o horário da UBS Vila Maria?")?.wantsHours, true);
  assertEquals(detectNamedServiceLocationQuery("que horas a UBS Vila Maria abre?")?.wantsHours, true);
  // termo continua limpo mesmo com referência temporal ("aos sábados")
  const fim = detectNamedServiceLocationQuery("a UBS Vila Maria funciona aos sábados?");
  assertEquals(fim?.term, "ubs vila maria");
  assertEquals(fim?.wantsHours, true);
});

Deno.test("detectNamedServiceLocationQuery: não intercepta contexto de relato/avaliação/ocupação/rota", () => {
  assertEquals(detectNamedServiceLocationQuery("tem um buraco na frente da UBS Vila Maria"), null);
  assertEquals(detectNamedServiceLocationQuery("quero avaliar a UBS Vila Maria"), null);
  assertEquals(detectNamedServiceLocationQuery("como está a ocupação da UBS Vila Maria?"), null);
  assertEquals(detectNamedServiceLocationQuery("como chegar na UBS Vila Maria"), null); // rota
});

Deno.test("detectNamedServiceLocationQuery: ignora mensagem sem tipo de serviço ou muito longa", () => {
  assertEquals(detectNamedServiceLocationQuery("onde fica a praça da sé"), null); // praça não é serviço mapeado
  assertEquals(detectNamedServiceLocationQuery("E a " + "x".repeat(200)), null);
});

Deno.test("prettyServiceName: acrônimos em maiúsculas, resto capitalizado", () => {
  assertEquals(prettyServiceName("ubs continental"), "UBS Continental");
  assertEquals(prettyServiceName("hospital das clinicas"), "Hospital Das Clinicas");
});
