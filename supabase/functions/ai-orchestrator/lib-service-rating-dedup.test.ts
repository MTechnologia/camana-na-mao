/// <reference path="./deno-runtime-shim.d.ts" />
/**
 * RN-AVA-003: uma avaliação por serviço por dia — testes do helper de fuso e do bloqueio em create_service_rating.
 * Executar: npx deno test --no-check --allow-env supabase/functions/ai-orchestrator/lib-service-rating-dedup.test.ts
 */

import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  executeTool,
  getZonedDayUtcBoundsISO,
  SERVICE_RATING_DUPLICATE_DAY_MESSAGE,
} from "./lib.ts";

Deno.test("getZonedDayUtcBoundsISO: intervalo [start,end) contém ref em UTC", () => {
  const ref = new Date("2026-07-15T14:22:00.000Z");
  const { startIso, endExclusiveIso } = getZonedDayUtcBoundsISO("America/Sao_Paulo", ref);
  const start = Date.parse(startIso);
  const end = Date.parse(endExclusiveIso);
  assertEquals(ref.getTime() >= start, true);
  assertEquals(ref.getTime() < end, true);
  assertEquals(start < end, true);
});

Deno.test("getZonedDayUtcBoundsISO: dia seguinte contíguo (start do próximo = end do atual)", () => {
  const ref = new Date("2026-01-10T12:00:00.000Z");
  const d0 = getZonedDayUtcBoundsISO("America/Sao_Paulo", ref);
  const nextDay = new Date(Date.parse(d0.endExclusiveIso) + 60_000);
  const d1 = getZonedDayUtcBoundsISO("America/Sao_Paulo", nextDay);
  assertEquals(d0.endExclusiveIso, d1.startIso);
});

Deno.test("create_service_rating: consulta encontra avaliação no mesmo dia → mensagem amigável", async () => {
  const visitId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const serviceId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  const now = Date.now();
  const visitRow = {
    id: visitId,
    service_id: serviceId,
    created_at: new Date(now - 3600000).toISOString(),
    expires_at: new Date(now + 7 * 24 * 3600000).toISOString(),
    status: "pending",
  };

  // deno-lint-ignore no-explicit-any
  const mockSupabase: any = {
    from(table: string) {
      if (table === "service_visits") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: visitRow,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "service_ratings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({
                  lt: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: { id: "existing-rating-id" },
                        error: null,
                      }),
                    }),
                  }),
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
      rating_text: "Atendimento bom no geral.",
      service_name: "UBS Teste",
    },
    userId,
    mockSupabase,
  );

  assertEquals(r.success, false);
  assertEquals(r.message, SERVICE_RATING_DUPLICATE_DAY_MESSAGE);
});

Deno.test("create_service_rating: corrida no insert (23505) → mesma mensagem amigável", async () => {
  const visitId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const serviceId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const userId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

  const now2 = Date.now();
  const visitRow2 = {
    id: visitId,
    service_id: serviceId,
    created_at: new Date(now2 - 3600000).toISOString(),
    expires_at: new Date(now2 + 7 * 24 * 3600000).toISOString(),
    status: "pending",
  };

  // deno-lint-ignore no-explicit-any
  const mockSupabase: any = {
    from(table: string) {
      if (table === "service_visits") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: visitRow2,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "service_ratings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({
                  lt: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: null,
                error: {
                  code: "23505",
                  message: 'duplicate key value violates unique constraint "idx_one_rating_per_service_per_day"',
                },
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
    rpc: async () => ({ data: "published", error: null }),
  };

  const r = await executeTool(
    "create_service_rating",
    {
      visit_id: visitId,
      rating_stars: 5,
      rating_text: "Experiência excelente hoje.",
      service_name: "UBS Teste",
    },
    userId,
    mockSupabase,
  );

  assertEquals(r.success, false);
  assertStringIncludes(r.message, "já avaliou");
  assertStringIncludes(r.message, "amanhã");
});
