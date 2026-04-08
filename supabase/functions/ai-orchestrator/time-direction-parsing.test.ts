import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { parseFieldResponse, parseFlexibleOccurrenceTime, normalizeTransportRecurrenceFrequency } from "./lib.ts";

Deno.test("parseFlexibleOccurrenceTime: normaliza formatos variados para HH:MM", () => {
  assertEquals(parseFlexibleOccurrenceTime("8h"), "08:00");
  assertEquals(parseFlexibleOccurrenceTime("08:15"), "08:15");
  assertEquals(parseFlexibleOccurrenceTime("8h15"), "08:15");
  assertEquals(parseFlexibleOccurrenceTime("0815"), "08:15");
  assertEquals(parseFlexibleOccurrenceTime("23h59"), "23:59");
  assertEquals(parseFlexibleOccurrenceTime("meio dia"), "12:00");
  assertEquals(parseFlexibleOccurrenceTime("meia noite"), "00:00");
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
