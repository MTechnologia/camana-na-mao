/// <reference path="./deno-runtime-shim.d.ts" />

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { executeTool } from "./lib.ts";

function buildMockSupabase(options: { publicationStatus?: string; visitId?: string; serviceId?: string }) {
  const visitId = options.visitId ?? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const serviceId = options.serviceId ?? "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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
                    created_at: new Date(Date.now() - 3600000).toISOString(),
                    expires_at: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
                    status: "pending",
                  },
                  error: null,
                }),
              }),
            }),
          }),
          update: () => ({
            // a implementação escopa por id E user_id: .update().eq("id").eq("user_id")
            eq: () => ({
              eq: async () => ({ error: null }),
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
                data: {
                  id: "rating-created-id",
                  publication_status: options.publicationStatus ?? "published",
                },
                error: null,
              }),
            }),
          }),
        };
      }

      throw new Error(`unexpected table: ${table}`);
    },
    rpc: async () => ({ data: options.publicationStatus ?? "published", error: null }),
  };

  return { mockSupabase };
}

Deno.test("create_service_rating: avaliação não negativa não oferece encaminhamento automático", async () => {
  const { mockSupabase } = buildMockSupabase({});

  const result = await executeTool(
    "create_service_rating",
    {
      visit_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      rating_stars: 4,
      rating_dimensions: {
        atendimento: 4,
        limpeza: 4,
        infraestrutura: 4,
        tempo_espera: 4,
      },
      rating_text: "Atendimento bom e estrutura adequada.",
      service_name: "UBS Teste",
      service_type: "ubs",
    },
    "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    mockSupabase,
  );

  assertEquals(result.success, true);
  assertStringIncludes(result.message, "[RATING_CREATED:");
  assertEquals(result.message.includes("[OFFER_REFERRAL]"), false);
});

Deno.test("create_service_rating: avaliação negativa oferece encaminhamento no app", async () => {
  const { mockSupabase } = buildMockSupabase({});

  const result = await executeTool(
    "create_service_rating",
    {
      visit_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      rating_stars: 3,
      rating_dimensions: {
        atendimento: 5,
        limpeza: 4,
        infraestrutura: 4,
        tempo_espera: 2,
      },
      rating_text: "Demora excessiva no atendimento.",
      service_name: "UBS Teste",
      service_type: "ubs",
    },
    "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    mockSupabase,
  );

  assertEquals(result.success, true);
  assertStringIncludes(result.message, "[OFFER_REFERRAL]");
});
