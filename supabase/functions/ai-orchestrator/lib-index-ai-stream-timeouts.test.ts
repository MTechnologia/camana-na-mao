import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { resolveStreamTimeouts } from "./lib-index-ai-stream.ts";

Deno.test("resolveStreamTimeouts amplia jornadas estruturadas", () => {
  const urban = resolveStreamTimeouts("urban_report");
  const general = resolveStreamTimeouts("general");
  assertEquals(urban.streamTimeoutMs > general.streamTimeoutMs, true);
  assertEquals(urban.readTimeoutMs > general.readTimeoutMs, true);
});
