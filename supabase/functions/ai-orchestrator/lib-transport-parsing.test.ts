import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  normalizeTransportRecurrenceFrequency,
  parseFlexibleOccurrenceTime,
} from "./lib-transport-parsing.ts";

Deno.test("normalizeTransportRecurrenceFrequency: typos informais (td semana / td dia)", () => {
  assertEquals(normalizeTransportRecurrenceFrequency("td semana"), "toda_semana");
  assertEquals(normalizeTransportRecurrenceFrequency("tds semana"), "toda_semana");
  assertEquals(normalizeTransportRecurrenceFrequency("td dia"), "todos_os_dias");
  assertEquals(normalizeTransportRecurrenceFrequency("tds dias"), "todos_os_dias");
  assertEquals(normalizeTransportRecurrenceFrequency("todo dia"), "todos_os_dias");
  assertEquals(normalizeTransportRecurrenceFrequency("toda semana"), "toda_semana");
});

Deno.test("parseFlexibleOccurrenceTime: formatos informais do munícipe", () => {
  assertEquals(parseFlexibleOccurrenceTime("7h5"), "07:05");
  assertEquals(parseFlexibleOccurrenceTime("foi 8h15"), "08:15");
});
