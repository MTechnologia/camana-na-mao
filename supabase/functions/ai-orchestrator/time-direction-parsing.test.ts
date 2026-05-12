import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  accumulateFieldsFromHistory,
  parseFieldResponse,
  parseFlexibleOccurrenceTime,
  normalizeTransportRecurrenceFrequency,
  isValidTransportSubcategory,
} from "./lib.ts";

Deno.test("parseFlexibleOccurrenceTime: normaliza formatos variados para HH:MM", () => {
  assertEquals(parseFlexibleOccurrenceTime("8h"), "08:00");
  assertEquals(parseFlexibleOccurrenceTime("08:15"), "08:15");
  assertEquals(parseFlexibleOccurrenceTime("8h15"), "08:15");
  assertEquals(parseFlexibleOccurrenceTime("0815"), "08:15");
  assertEquals(parseFlexibleOccurrenceTime("23h59"), "23:59");
  assertEquals(parseFlexibleOccurrenceTime("meio dia"), "12:00");
  assertEquals(parseFlexibleOccurrenceTime("meia noite"), "00:00");
});

Deno.test("parseFlexibleOccurrenceTime: não confunde número de linha (ex. 1233) com horário 12:33", () => {
  assertEquals(parseFlexibleOccurrenceTime("Linha informada (fora da lista): 1233"), null);
  assertEquals(parseFlexibleOccurrenceTime("linha não listada: 1233"), null);
  assertEquals(parseFlexibleOccurrenceTime("1233"), "12:33");
});

Deno.test("parseFieldResponse: occurrence_time aceita texto livre e normaliza", () => {
  assertEquals(parseFieldResponse("occurrence_time", "foi 7h5"), { occurrence_time: "07:05" });
  assertEquals(parseFieldResponse("occurrence_time", "às 19:45"), { occurrence_time: "19:45" });
});

Deno.test("parseFieldResponse: direction mapeia ida/volta/circular", () => {
  assertEquals(parseFieldResponse("direction", "Ida"), { direction: "ida" });
  assertEquals(parseFieldResponse("direction", "Volta"), { direction: "volta" });
  assertEquals(parseFieldResponse("direction", "Circular"), { direction: "circular" });
});

Deno.test("normalizeTransportRecurrenceFrequency: normaliza as 4 opções", () => {
  assertEquals(normalizeTransportRecurrenceFrequency("Primeira vez"), "primeira_vez");
  assertEquals(normalizeTransportRecurrenceFrequency("Algumas vezes/mês"), "algumas_vezes_mes");
  assertEquals(normalizeTransportRecurrenceFrequency("Toda semana"), "toda_semana");
  assertEquals(normalizeTransportRecurrenceFrequency("Todos os dias"), "todos_os_dias");
});

Deno.test("parseFieldResponse: recurrence_frequency mapeia as 4 opções", () => {
  assertEquals(parseFieldResponse("recurrence_frequency", "Primeira vez"), { recurrence_frequency: "primeira_vez" });
  assertEquals(parseFieldResponse("recurrence_frequency", "Algumas vezes/mês"), { recurrence_frequency: "algumas_vezes_mes" });
  assertEquals(parseFieldResponse("recurrence_frequency", "Toda semana"), { recurrence_frequency: "toda_semana" });
  assertEquals(parseFieldResponse("recurrence_frequency", "Todos os dias"), { recurrence_frequency: "todos_os_dias" });
});

Deno.test("parseFieldResponse: sub_category extrai marcador do picker", () => {
  assertEquals(
    parseFieldResponse(
      "sub_category",
      "Subcategoria: Não passou [SUBCATEGORY_SELECTED:nao_passou] [SUBCATEGORY_REPORT_TYPE:atraso]",
    ),
    { sub_category: "nao_passou", report_type: "atraso" },
  );
});

Deno.test("accumulateFieldsFromHistory: último FIELD_REQUEST quando JSON contém substring enganosa", () => {
  const progressPayload = {
    description: "Texto do usuário com [FIELD_REQUEST:description] colado",
    report_type: "atraso",
  };
  const assistantMsg =
    `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(progressPayload)}]` +
    `[FIELD_REQUEST:sub_category]Qual detalhe descreve melhor esse problema?[SUBCATEGORY_PICKER:atraso]`;
  const userMsg =
    "Subcategoria: Não passou [SUBCATEGORY_SELECTED:nao_passou] [SUBCATEGORY_REPORT_TYPE:atraso]";
  const fields = accumulateFieldsFromHistory(
    [
      { role: "user", content: "Ônibus 875P não passou no ponto" },
      { role: "assistant", content: assistantMsg },
      { role: "user", content: userMsg },
    ],
    "transport_report",
  );
  assertEquals(fields.sub_category, "nao_passou");
});

Deno.test("accumulateFieldsFromHistory: SUBCATEGORY_SELECTED funciona sem FIELD_REQUEST na assistente", () => {
  const progressPayload = { description: "linha 875 não passou", report_type: "atraso" };
  const assistantMsg =
    `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(progressPayload)}]` +
    `Qual detalhe descreve melhor esse problema?[SUBCATEGORY_PICKER:atraso]`;
  const userMsg =
    "Subcategoria: Intervalo irregular [SUBCATEGORY_SELECTED:intervalo_irregular] [SUBCATEGORY_REPORT_TYPE:atraso]";
  const fields = accumulateFieldsFromHistory(
    [
      { role: "user", content: "Ônibus 875P não passou no ponto" },
      { role: "assistant", content: assistantMsg },
      { role: "user", content: userMsg },
    ],
    "transport_report",
  );
  assertEquals(fields.sub_category, "intervalo_irregular");
  assertEquals(fields.report_type, "atraso");
});

Deno.test("accumulateFieldsFromHistory: fallback por rótulo Subcategoria: sem marcadores", () => {
  const progressPayload = { description: "linha 875", report_type: "atraso" };
  const assistantMsg =
    `[COLLECTION_PROGRESS:transport_report:${JSON.stringify(progressPayload)}][SUBCATEGORY_PICKER:atraso]`;
  const fields = accumulateFieldsFromHistory(
    [
      { role: "user", content: "Atraso ônibus" },
      { role: "assistant", content: assistantMsg },
      { role: "user", content: "Subcategoria: Não passou" },
    ],
    "transport_report",
  );
  assertEquals(fields.sub_category, "nao_passou");
});

Deno.test("isValidTransportSubcategory: cobre todos os tipos de problema", () => {
  assertEquals(isValidTransportSubcategory("atraso", "nao_passou"), true);
  assertEquals(isValidTransportSubcategory("lotacao", "superlotado"), true);
  assertEquals(isValidTransportSubcategory("seguranca", "assedio"), true);
  assertEquals(isValidTransportSubcategory("acessibilidade", "elevador_escada"), true);
  assertEquals(isValidTransportSubcategory("limpeza", "veiculo_sujo"), true);
  assertEquals(isValidTransportSubcategory("conducao", "freada_brusca"), true);
  assertEquals(isValidTransportSubcategory("outro", "outro"), true);
  assertEquals(isValidTransportSubcategory("atraso", "superlotado"), false);
});
