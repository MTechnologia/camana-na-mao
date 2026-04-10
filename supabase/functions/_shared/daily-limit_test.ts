import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  DEFAULT_DAILY_NOTIFICATION_LIMIT,
  effectiveDailyLimit,
  shouldDiscardForDailyLimit,
} from "./daily-limit.ts";

Deno.test("effectiveDailyLimit default e mínimo", () => {
  assertEquals(effectiveDailyLimit(undefined), DEFAULT_DAILY_NOTIFICATION_LIMIT);
  assertEquals(effectiveDailyLimit(null), DEFAULT_DAILY_NOTIFICATION_LIMIT);
  assertEquals(effectiveDailyLimit(0), DEFAULT_DAILY_NOTIFICATION_LIMIT);
  assertEquals(effectiveDailyLimit(-1), DEFAULT_DAILY_NOTIFICATION_LIMIT);
  assertEquals(effectiveDailyLimit(15), 15);
});

Deno.test("11ª notificação: descartar quando count >= limit e não crítica", () => {
  assertEquals(shouldDiscardForDailyLimit(10, 10, false), true);
  assertEquals(shouldDiscardForDailyLimit(9, 10, false), false);
});

Deno.test("crítica ignora limite", () => {
  assertEquals(shouldDiscardForDailyLimit(999, 10, true), false);
});
