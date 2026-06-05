import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { cleanServiceAddress } from "./lib-service-address-format.ts";

Deno.test("cleanServiceAddress: decodifica entidade HTML e remove travessão solto no fim", () => {
  const raw = "CEU Butantã &#8211; Professora Elizabeth Gaspar Tunala Av. Eng. Heitor Antônio Eiras Garcia, 1870 - Jardim Esmeralda -";
  assertEquals(
    cleanServiceAddress(raw),
    "CEU Butantã – Professora Elizabeth Gaspar Tunala Av. Eng. Heitor Antônio Eiras Garcia, 1870 - Jardim Esmeralda",
  );
});

Deno.test("cleanServiceAddress: outras entidades + espaços + bordas", () => {
  assertEquals(cleanServiceAddress("  &amp; Posto&nbsp;Central  "), "& Posto Central");
  assertEquals(cleanServiceAddress("– Rua X, 10 –"), "Rua X, 10");
  assertEquals(cleanServiceAddress(""), "");
  assertEquals(cleanServiceAddress(null), "");
});
