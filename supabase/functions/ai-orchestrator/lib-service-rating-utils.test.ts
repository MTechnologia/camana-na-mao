import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { normalizeServiceRatingNeighborhood } from "./lib-service-rating-utils.ts";

Deno.test("normalizeServiceRatingNeighborhood remove duplicacao consecutiva", () => {
  assertEquals(normalizeServiceRatingNeighborhood("Butantã Butantã"), "Butantã");
  assertEquals(normalizeServiceRatingNeighborhood("  Vila   Mariana   Vila  Mariana "), "Vila Mariana Vila Mariana");
});

Deno.test("normalizeServiceRatingNeighborhood preserva vazio e case-insensitive", () => {
  assertEquals(normalizeServiceRatingNeighborhood(""), "");
  assertEquals(normalizeServiceRatingNeighborhood(null), "");
  assertEquals(normalizeServiceRatingNeighborhood("Moema moema"), "Moema");
});
