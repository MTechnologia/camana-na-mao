import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrlFromAddresses,
  getServiceTypeName,
  inferServiceTypeFromText,
} from "./lib-service-discovery.ts";

Deno.test("inferServiceTypeFromText: reconhece tipos de serviço comuns", () => {
  assertEquals(inferServiceTypeFromText("Quero uma UBS perto de mim"), "ubs");
  assertEquals(inferServiceTypeFromText("Tem parques próximos?"), "park");
  assertEquals(inferServiceTypeFromText("Onde fica o mercado municipal?"), "city_market");
});

Deno.test("service discovery helpers: mantêm nomes amigáveis e URLs de rota", () => {
  assertEquals(getServiceTypeName("library"), "bibliotecas");
  assertEquals(
    buildGoogleMapsDirectionsUrl(-23.55, -46.63, "Praça da Sé, São Paulo"),
    "https://www.google.com/maps/dir/?api=1&origin=-23.55,-46.63&destination=Pra%C3%A7a%20da%20S%C3%A9%2C%20S%C3%A3o%20Paulo&travelmode=transit",
  );
  assertEquals(
    buildGoogleMapsDirectionsUrlFromAddresses("Pinheiros, São Paulo", "CEU Butantã"),
    "https://www.google.com/maps/dir/?api=1&origin=Pinheiros%2C%20S%C3%A3o%20Paulo&destination=CEU%20Butant%C3%A3&travelmode=transit",
  );
});
