import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { detectCollectionIntent } from "./lib.ts";

Deno.test("detectCollectionIntent via lib.ts mantém contrato externo", () => {
  const result = detectCollectionIntent(
    "Quero ver meus relatos",
    [{ role: "user", content: "Quero ver meus relatos" }],
    () => ({}),
  );

  assertEquals(result, { type: "history", fields: {} });
});
