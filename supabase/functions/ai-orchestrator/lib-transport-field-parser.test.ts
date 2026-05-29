import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { parseTransportFieldResponse } from "./lib-transport-field-parser.ts";

const deps = {
  normalizeTransportAccessibilityDetails: () => ({ ok: true }),
  parseAccessibilityDetailsMarker: () => null,
};

Deno.test("parseTransportFieldResponse permite pular stop_name", () => {
  const out = parseTransportFieldResponse("stop_name", "pular", deps);
  assertEquals(out?._stop_name_skipped, true);
  assertEquals(out?.stop_name, "não informado");
});

Deno.test("parseTransportFieldResponse permite pular stop_location", () => {
  const out = parseTransportFieldResponse("stop_location", "não sei", deps);
  assertEquals(out?._stop_location_skipped, true);
  assertEquals(out?.stop_location, "não informado");
});
