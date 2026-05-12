/**
 * RN-AVA-002: prazo 48h / janela expires_at — helpers e create_service_rating com visit_id.
 * Executar: npx deno test --no-check --allow-env supabase/functions/ai-orchestrator/lib-service-rating-48h.test.ts
 */

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  isPastVisitRating48hDeadline,
  isVisitRatingWindowClosed,
  SERVICE_RATING_VISIT_DEADLINE_EXPIRED_MESSAGE,
} from "../_shared/service-visit-rating-deadline.ts";
import { executeTool } from "./lib.ts";

const H48_MS = 48 * 60 * 60 * 1000;

Deno.test("isPastVisitRating48hDeadline: 1ms antes do limite → ainda dentro", () => {
  const t0 = Date.parse("2026-03-01T10:00:00.000Z");
  const created = new Date(t0).toISOString();
  assertEquals(isPastVisitRating48hDeadline(created, t0 + H48_MS - 1), false);
});

Deno.test("isPastVisitRating48hDeadline: exatamente 48h → expirado (>=)", () => {
  const t0 = Date.parse("2026-03-01T10:00:00.000Z");
  const created = new Date(t0).toISOString();
  assertEquals(isPastVisitRating48hDeadline(created, t0 + H48_MS), true);
});

Deno.test("isVisitRatingWindowClosed: dentro de 48h e antes de expires_at → aberto", () => {
  const t0 = Date.parse("2026-04-01T12:00:00.000Z");
  const created = new Date(t0).toISOString();
  const expires = new Date(t0 + 7 * 24 * 3600000).toISOString();
  assertEquals(isVisitRatingWindowClosed(created, expires, t0 + H48_MS - 1), false);
});

Deno.test("isVisitRatingWindowClosed: após expires_at mesmo dentro de 48h → fechado", () => {
  const t0 = Date.parse("2026-04-01T12:00:00.000Z");
  const created = new Date(t0).toISOString();
  const expires = new Date(t0 + 3600000).toISOString();
  assertEquals(isVisitRatingWindowClosed(created, expires, t0 + 7200000), true);
});

Deno.test("create_service_rating: visita pending com prazo vencido → mensagem RN-AVA-002 e tentativa de expired", async () => {
  const visitId = "11111111-1111-4111-8111-111111111111";
  const serviceId = "22222222-2222-4222-8222-222222222222";
  const userId = "33333333-3333-4333-8333-333333333333";
  const old = Date.now() - H48_MS - 60000;

  let updateCalled = false;

  // deno-lint-ignore no-explicit-any
  const mockSupabase: any = {
    from(table: string) {
      if (table === "service_visits") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: visitId,
                    service_id: serviceId,
                    created_at: new Date(old).toISOString(),
                    expires_at: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
                    status: "pending",
                  },
                  error: null,
                }),
              }),
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: () => ({
              eq: () => ({
                eq: async () => {
                  updateCalled = true;
                  assertEquals(payload.status, "expired");
                  return { error: null };
                },
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };

  const r = await executeTool(
    "create_service_rating",
    {
      visit_id: visitId,
      rating_stars: 5,
      rating_text: "Tentativa após prazo.",
      service_name: "UBS",
    },
    userId,
    mockSupabase,
  );

  assertEquals(r.success, false);
  assertEquals(r.message, SERVICE_RATING_VISIT_DEADLINE_EXPIRED_MESSAGE);
  assertEquals(updateCalled, true);
});

Deno.test("create_service_rating: visita já expired → mensagem sem update", async () => {
  const visitId = "44444444-4444-4444-8444-444444444444";
  const serviceId = "55555555-5555-4555-8555-555555555555";
  const userId = "66666666-6666-4666-8666-666666666666";

  // deno-lint-ignore no-explicit-any
  const mockSupabase: any = {
    from(table: string) {
      if (table === "service_visits") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: visitId,
                    service_id: serviceId,
                    created_at: new Date(Date.now() - 96 * 3600000).toISOString(),
                    expires_at: new Date(Date.now() + 3600000).toISOString(),
                    status: "expired",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };

  const r = await executeTool(
    "create_service_rating",
    {
      visit_id: visitId,
      rating_stars: 4,
      rating_text: "Qualquer texto suficiente.",
      service_name: "UBS",
    },
    userId,
    mockSupabase,
  );

  assertEquals(r.success, false);
  assertEquals(r.message, SERVICE_RATING_VISIT_DEADLINE_EXPIRED_MESSAGE);
});
