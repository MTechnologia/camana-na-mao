import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { isGenericIntentText, isSubstantiveUrbanNatureDescription, isValidDomainDescription } from "./lib-nlp-utils.ts";
import { isBareUrbanReportNatureReply, normalizeReportNature } from "./lib-urban-rules.ts";
import {
  applySelectedAddressFieldsFromHistory,
  detectLatestDomainDescriptionFromHistory,
} from "./lib-history-address-and-description.ts";

Deno.test("applySelectedAddressFieldsFromHistory: extrai endereço com número, bairro, cidade e CEP", () => {
  const accumulated: Record<string, unknown> = {};

  applySelectedAddressFieldsFromHistory(
    [
      {
        role: "user",
        content: "Endereço selecionado: Rua das Flores, 1477 - Centro, São Paulo - CEP: 01000-000",
      },
    ],
    accumulated,
  );

  assertEquals(accumulated.street, "Rua das Flores");
  assertEquals(accumulated.street_number, "1477");
  assertEquals(accumulated.neighborhood, "Centro");
  assertEquals(accumulated.city, "São Paulo");
  assertEquals(accumulated.cep, "01000000");
});

Deno.test("detectLatestDomainDescriptionFromHistory: ignora mensagens estruturadas e pega descrição mais recente válida", () => {
  const description = detectLatestDomainDescriptionFromHistory(
    [
      { role: "user", content: "Digitar CEP ou endereço" },
      { role: "user", content: "Endereço selecionado: Rua das Flores - Centro, São Paulo - CEP: 01000-000" },
      { role: "user", content: "Tem lixo acumulado na rua há dias e um cheiro forte no local" },
    ],
    "urban_report",
    {
      isGenericIntentText,
      isValidDomainDescription,
      isBareUrbanReportNatureReply,
    },
  );

  assertEquals(description, "Tem lixo acumulado na rua há dias e um cheiro forte no local");
});

Deno.test("detectLatestDomainDescriptionFromHistory: aceita dúvida substantiva (quero saber sobre...)", () => {
  const description = detectLatestDomainDescriptionFromHistory(
    [
      { role: "user", content: "duvida" },
      { role: "user", content: "Quero saber sobre os serviços disponíveis na cidade de SP" },
    ],
    "urban_report",
    {
      isGenericIntentText,
      isValidDomainDescription,
      isBareUrbanReportNatureReply,
      isSubstantiveUrbanNatureDescription,
      normalizeReportNature,
    },
  );

  assertEquals(description, "Quero saber sobre os serviços disponíveis na cidade de SP");
});

Deno.test("detectLatestDomainDescriptionFromHistory: não trata natureza isolada como descrição urbana", () => {
  const description = detectLatestDomainDescriptionFromHistory(
    [
      { role: "user", content: "reclamação" },
    ],
    "urban_report",
    {
      isGenericIntentText,
      isValidDomainDescription,
      isBareUrbanReportNatureReply,
    },
  );

  assertEquals(description, null);
});
