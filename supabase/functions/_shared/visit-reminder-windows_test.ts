import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  isEligibleForEvaluationReminder,
  shouldExpirePendingVisit,
} from "./visit-reminder-windows.ts";

const H = 60 * 60 * 1000;

Deno.test("25h: elegível a lembrete, não expira", () => {
  const created = new Date("2025-06-01T12:00:00.000Z");
  const now = new Date(created.getTime() + 25 * H);
  assertEquals(isEligibleForEvaluationReminder(created, now), true);
  assertEquals(shouldExpirePendingVisit(created, now), false);
});

Deno.test("23h: não elegível a lembrete", () => {
  const created = new Date("2025-06-01T12:00:00.000Z");
  const now = new Date(created.getTime() + 23 * H);
  assertEquals(isEligibleForEvaluationReminder(created, now), false);
});

Deno.test("49h: expira, não lembrete", () => {
  const created = new Date("2025-06-01T12:00:00.000Z");
  const now = new Date(created.getTime() + 49 * H);
  assertEquals(isEligibleForEvaluationReminder(created, now), false);
  assertEquals(shouldExpirePendingVisit(created, now), true);
});

Deno.test("47h: ainda lembrete, não expira", () => {
  const created = new Date("2025-06-01T12:00:00.000Z");
  const now = new Date(created.getTime() + 47 * H);
  assertEquals(isEligibleForEvaluationReminder(created, now), true);
  assertEquals(shouldExpirePendingVisit(created, now), false);
});

Deno.test("48h exatas: expira (limite superior exclusivo para lembrete)", () => {
  const created = new Date("2025-06-01T12:00:00.000Z");
  const now = new Date(created.getTime() + 48 * H);
  assertEquals(isEligibleForEvaluationReminder(created, now), false);
  assertEquals(shouldExpirePendingVisit(created, now), true);
});
