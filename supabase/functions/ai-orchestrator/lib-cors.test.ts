import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { buildCorsHeaders } from "./lib-cors.ts";

Deno.test("buildCorsHeaders usa * quando lista vazia", () => {
  const headers = buildCorsHeaders("https://app.example", () => "");
  assertEquals(headers["Access-Control-Allow-Origin"], "*");
});

Deno.test("buildCorsHeaders reflete origem permitida", () => {
  const headers = buildCorsHeaders(
    "https://dev.camana.example",
    (key) => (key === "AI_CORS_ALLOWED_ORIGINS" ? "https://dev.camana.example,https://hml.camana.example" : ""),
  );
  assertEquals(headers["Access-Control-Allow-Origin"], "https://dev.camana.example");
});
