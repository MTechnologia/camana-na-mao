import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { isVertexRagEnabled } from "./lib-vertex-rag.ts";

Deno.test("isVertexRagEnabled respeita disable", () => {
  assertEquals(
    isVertexRagEnabled((key) => (key === "AI_DISABLE_VERTEX_RAG" ? "true" : "corp")),
    false,
  );
});

Deno.test("isVertexRagEnabled liga com enable explícito", () => {
  assertEquals(
    isVertexRagEnabled((key) => (key === "AI_ENABLE_VERTEX_RAG" ? "true" : "")),
    true,
  );
});
