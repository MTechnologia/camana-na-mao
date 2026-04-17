import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildTransportSubcategoryRequest,
  maybeCreateSimilarTransportReportsResponse,
} from "./lib-index-transport-shared.ts";

Deno.test("buildTransportSubcategoryRequest monta FIELD_REQUEST com picker", () => {
  const text = buildTransportSubcategoryRequest({ report_type: "atraso" }, "atraso");
  assertEquals(text.includes("[FIELD_REQUEST:sub_category]"), true);
  assertEquals(text.includes("[SUBCATEGORY_PICKER:atraso]"), true);
});

Deno.test("maybeCreateSimilarTransportReportsResponse retorna SSE com lista de similares", async () => {
  const result = await maybeCreateSimilarTransportReportsResponse({
    accumulatedFields: { report_type: "atraso", line_code: "875A-10" },
    corsHeaders: {},
    logContext: "[test] similares:",
    // deno-lint-ignore no-explicit-any
    supabase: {} as any,
    userId: "user-1",
    // deno-lint-ignore no-explicit-any
    lib: {
      fetchSimilarTransportReportsForSupport: async () => [{ id: "r1" }],
    } as any,
  });

  assertExists(result);
  const text = await result!.text();
  assertEquals(text.includes("[SIMILAR_TRANSPORT_REPORTS_B64:"), true);
  assertEquals(text.includes("Registrar novo relato"), true);
});
