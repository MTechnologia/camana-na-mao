import { assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { createSseResponse } from "./lib-index-sse.ts";

Deno.test("createSseResponse monta SSE com delta content", async () => {
  const response = createSseResponse("teste", { "Access-Control-Allow-Origin": "*" });
  const text = await response.text();

  assertStringIncludes(text, '"content":"teste"');
  assertStringIncludes(text, "data: ");
  assertStringIncludes(text, "[DONE]");
});
