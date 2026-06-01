import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { computeRetryUpdate, MAX_NOTIFICATION_RETRIES } from "./notification-retry.ts";

const NOW = Date.UTC(2026, 5, 1, 12, 0, 0); // 2026-06-01T12:00:00Z

Deno.test("computeRetryUpdate: primeira falha agenda backoff de 5 min", () => {
  const u = computeRetryUpdate(0, NOW, "HTTP 500");
  assertEquals(u.dead, false);
  assertEquals(u.retry_count, 1);
  assertEquals(u.delivery_status, "failed");
  assertEquals(u.next_retry_at, new Date(NOW + 5 * 60_000).toISOString());
});

Deno.test("computeRetryUpdate: backoff exponencial (2a falha = 10 min)", () => {
  const u = computeRetryUpdate(1, NOW, "erro");
  assertEquals(u.retry_count, 2);
  assertEquals(u.next_retry_at, new Date(NOW + 10 * 60_000).toISOString());
});

Deno.test("computeRetryUpdate: ao atingir MAX vira dead-letter", () => {
  const u = computeRetryUpdate(MAX_NOTIFICATION_RETRIES - 1, NOW, "erro final");
  assertEquals(u.dead, true);
  assertEquals(u.delivery_status, "dead");
  assertEquals(u.next_retry_at, null);
  assertEquals(u.retry_count, MAX_NOTIFICATION_RETRIES);
});

Deno.test("computeRetryUpdate: trata retry_count null e trunca erro", () => {
  const u = computeRetryUpdate(null, NOW, "x".repeat(1000));
  assertEquals(u.retry_count, 1);
  assertEquals(u.last_error.length, 500);
});
