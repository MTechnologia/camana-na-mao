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

Deno.test("buildCorsHeaders usa APP_URL/SITE_URL quando AI_CORS_ALLOWED_ORIGINS vazio (sem cair em *)", () => {
  const env = (key: string): string => {
    if (key === "APP_URL") return "https://app.camana.example";
    if (key === "SITE_URL") return "https://hml.camana.example";
    return "";
  };
  // origem permitida (SITE_URL) é refletida
  assertEquals(
    buildCorsHeaders("https://hml.camana.example", env)["Access-Control-Allow-Origin"],
    "https://hml.camana.example",
  );
  // localhost (dev) é refletido
  assertEquals(
    buildCorsHeaders("http://localhost:8080", env)["Access-Control-Allow-Origin"],
    "http://localhost:8080",
  );
  // origem desconhecida cai para a primeira permitida (APP_URL), não '*'
  assertEquals(
    buildCorsHeaders("https://malicioso.example", env)["Access-Control-Allow-Origin"],
    "https://app.camana.example",
  );
});
