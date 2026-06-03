import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrlFromAddresses,
  getServiceAddressByName,
  getServiceTypeName,
  inferServiceTypeFromText,
} from "./lib-service-discovery.ts";

// Mock mínimo do query builder do supabase-js para capturar a chamada.
// deno-lint-ignore no-explicit-any
function makeSupabaseMock(rows: any[]) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "textSearch", "ilike", "limit"]) {
    builder[m] = (...args: unknown[]) => {
      calls.push({ method: m, args });
      return builder;
    };
  }
  // torna o builder "awaitable" resolvendo { data, error }
  (builder as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    resolve({ data: rows, error: null });
  return {
    calls,
    client: { from: (table: string) => { calls.push({ method: "from", args: [table] }); return builder; } },
  };
}

Deno.test("inferServiceTypeFromText: reconhece tipos de serviço comuns", () => {
  assertEquals(inferServiceTypeFromText("Quero uma UBS perto de mim"), "ubs");
  assertEquals(inferServiceTypeFromText("Tem parques próximos?"), "park");
  assertEquals(inferServiceTypeFromText("Onde fica o mercado municipal?"), "city_market");
});

Deno.test("getServiceAddressByName usa full-text (search_tsv), não ILIKE, e prefere melhor match", async () => {
  const { calls, client } = makeSupabaseMock([
    { name: "UBS Jardim Lmisboa", address: "Rua A, 1", district: "Brasilândia", phone: null },
    { name: "UBS Jardim Paulista", address: "Av. B, 200", district: "Jd Paulista", phone: "11 2222-3333" },
  ]);

  // deno-lint-ignore no-explicit-any
  const result = await getServiceAddressByName(client as any, "UBS Jardim Paulista");

  // Deve consultar via FTS e não via ILIKE.
  const methods = calls.map((c) => c.method);
  assertEquals(methods.includes("textSearch"), true);
  assertEquals(methods.includes("ilike"), false);
  const ts = calls.find((c) => c.method === "textSearch");
  assertEquals(ts?.args[0], "search_tsv");

  // Heurística escolhe o nome correspondente (não apenas o primeiro da lista).
  assertStringIncludes(result ?? "", "UBS Jardim Paulista");
  assertStringIncludes(result ?? "", "Av. B, 200");
});

Deno.test("getServiceAddressByName retorna null para termo curto sem consultar o banco", async () => {
  const { calls, client } = makeSupabaseMock([]);
  // deno-lint-ignore no-explicit-any
  const result = await getServiceAddressByName(client as any, "ub");
  assertEquals(result, null);
  assertEquals(calls.length, 0);
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
