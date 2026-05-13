import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  fetchSimilarTransportReportsForSupport,
  lookupCEP,
  resolveUrbanCoordsForSimilarSearch,
} from "./lib-location-and-similarity.ts";

Deno.test("lookupCEP: rejeita CEP inválido sem chamar rede", async () => {
  const result = await lookupCEP("123");
  assertEquals(result, { valid: false });
});

Deno.test("resolveUrbanCoordsForSimilarSearch: prioriza user_lat/user_lon", async () => {
  const fakeSupabase = {} as Parameters<typeof resolveUrbanCoordsForSimilarSearch>[0];
  const result = await resolveUrbanCoordsForSimilarSearch(fakeSupabase, {
    user_lat: -23.55,
    user_lon: -46.63,
    street: "Rua ignorada",
  });

  assertEquals(result, { lat: -23.55, lon: -46.63 });
});

Deno.test("fetchSimilarTransportReportsForSupport: retorna vazio sem tipo ou linha", async () => {
  const fakeSupabase = {} as Parameters<typeof fetchSimilarTransportReportsForSupport>[0];
  const emptyType = await fetchSimilarTransportReportsForSupport(fakeSupabase, {}, "user-1");
  const emptyLine = await fetchSimilarTransportReportsForSupport(fakeSupabase, { report_type: "atraso" }, "user-1");

  assertEquals(emptyType, []);
  assertEquals(emptyLine, []);
});
