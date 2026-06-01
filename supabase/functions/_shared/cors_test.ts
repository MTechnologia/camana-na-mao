import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { buildCorsHeaders, resolveAllowedOrigin } from "./cors.ts";

const env = (map: Record<string, string>) => (k: string) => map[k];

const PROD = "https://app.camaranamao.sp.gov.br";
const HML = "https://hml.camaranamao.sp.gov.br";
const envProd = env({ APP_URL: PROD, SITE_URL: HML });

Deno.test("resolveAllowedOrigin reflete origem permitida (APP_URL / SITE_URL)", () => {
  assertEquals(resolveAllowedOrigin(PROD, envProd), PROD);
  assertEquals(resolveAllowedOrigin(HML, envProd), HML);
  // tolera barra final
  assertEquals(resolveAllowedOrigin(PROD + "/", envProd), PROD);
});

Deno.test("resolveAllowedOrigin permite localhost (dev)", () => {
  assertEquals(resolveAllowedOrigin("http://localhost:8080", envProd), "http://localhost:8080");
  assertEquals(resolveAllowedOrigin("http://127.0.0.1:5173", envProd), "http://127.0.0.1:5173");
});

Deno.test("resolveAllowedOrigin nega origem desconhecida -> primeira estática", () => {
  assertEquals(resolveAllowedOrigin("https://malicioso.example", envProd), PROD);
  // sem origem -> primeira estática
  assertEquals(resolveAllowedOrigin(null, envProd), PROD);
});

Deno.test("buildCorsHeaders monta headers refletindo a origem", () => {
  const headers = buildCorsHeaders(
    { headers: { get: (n: string) => (n === "origin" ? HML : null) } },
    envProd,
  );
  assertEquals(headers["Access-Control-Allow-Origin"], HML);
  assertEquals(headers["Vary"], "Origin");
  assertEquals(headers["Access-Control-Allow-Headers"].includes("authorization"), true);
});

Deno.test("buildCorsHeaders cai para '*' quando nada configurado", () => {
  const headers = buildCorsHeaders(
    { headers: { get: () => null } },
    env({}),
  );
  assertEquals(headers["Access-Control-Allow-Origin"], "*");
});
