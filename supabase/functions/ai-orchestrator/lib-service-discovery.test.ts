import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrlFromAddresses,
  findNearbyServices,
  formatServicesWithContext,
  getServiceAddressByName,
  getServiceTypeName,
  inferServiceTypeFromText,
} from "./lib-service-discovery.ts";

// Mock mínimo do query builder do supabase-js para capturar a chamada.
// deno-lint-ignore no-explicit-any
function makeSupabaseMock(rows: any[]) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "textSearch", "ilike", "eq", "gte", "lte", "limit"]) {
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

Deno.test("inferServiceTypeFromText: trem/CPTM → train_station, metrô → metro_station, ônibus → transit_station", () => {
  // Trem / CPTM têm camada própria (estacao_trem) — não podem virar ponto de ônibus.
  assertEquals(inferServiceTypeFromText("Qual a estação de trem mais próxima?"), "train_station");
  assertEquals(inferServiceTypeFromText("estação da CPTM perto de mim"), "train_station");
  // Metrô tem camada própria (estacao_metro).
  assertEquals(inferServiceTypeFromText("estação de metrô perto de mim"), "metro_station");
  assertEquals(inferServiceTypeFromText("onde fica o metrô mais próximo"), "metro_station");
  // Ônibus / terminal / estação genérica → transit_station (paradas de ônibus GeoSampa).
  assertEquals(inferServiceTypeFromText("terminal de ônibus próximo"), "transit_station");
  assertEquals(inferServiceTypeFromText("ponto de ônibus mais perto"), "transit_station");
  assertEquals(inferServiceTypeFromText("onde fica a estação mais próxima"), "transit_station");
});

Deno.test("findNearbyServices: estação de trem filtra source_layer e ordena por distância (sem exigir endereço)", async () => {
  // Estações reais têm address="Endereço não informado" mas nome + coordenadas.
  const rows = [
    { name: "BRÁS", district: "São Paulo", latitude: -23.5247, longitude: -46.6147 },
    { name: "LUZ", district: "São Paulo", latitude: -23.5350, longitude: -46.6356 },
  ];
  const { calls, client } = makeSupabaseMock(rows);
  // deno-lint-ignore no-explicit-any
  const out = await findNearbyServices(
    client as any,
    "train_station",
    undefined,
    5,
    -23.5247, // perto da BRÁS
    -46.6147,
    2000,
    0,
    null,
    "Centro",
  );
  // Filtrou pela camada de trem (não devolveu ponto de ônibus).
  const eqCalls = calls.filter((c) => c.method === "eq");
  assertEquals(eqCalls.some((c) => c.args[0] === "service_type" && c.args[1] === "transit_station"), true);
  assertEquals(eqCalls.some((c) => c.args[0] === "source_layer" && c.args[1] === "estacao_trem"), true);
  // Exibe a estação pelo nome (título), com distância, e não "Endereço não informado".
  assertStringIncludes(out, "estações de trem (CPTM)");
  assertStringIncludes(out, "Estação Brás");
  assertEquals(out.includes("Endereço não informado"), false);
});

Deno.test("findNearbyServices: estação de trem RESPEITA o raio (exclui as fora do raio)", async () => {
  // Regressão: antes o raio era ignorado para trem/metrô (sempre as N mais próximas).
  const rows = [
    { name: "PROXIMA", district: "São Paulo", latitude: -23.5220, longitude: -46.6147 }, // ~300 m
    { name: "DISTANTE", district: "São Paulo", latitude: -23.5700, longitude: -46.6600 }, // ~6,8 km
  ];
  const { client } = makeSupabaseMock(rows);
  // deno-lint-ignore no-explicit-any
  const out = await findNearbyServices(
    client as any,
    "train_station",
    undefined,
    10,
    -23.5247,
    -46.6147,
    500, // raio 500 m
    0,
    null,
    "Centro",
  );
  assertStringIncludes(out, "Estação Proxima");
  assertEquals(out.includes("Estação Distante"), false);
  // Como há estação dentro do raio, NÃO usa o aviso de fallback.
  assertEquals(out.includes("Não há"), false);
});

Deno.test("findNearbyServices: nenhuma estação no raio → mostra as mais próximas com aviso", async () => {
  const rows = [
    { name: "PROXIMA", district: "São Paulo", latitude: -23.5220, longitude: -46.6147 }, // ~300 m
    { name: "DISTANTE", district: "São Paulo", latitude: -23.5700, longitude: -46.6600 },
  ];
  const { client } = makeSupabaseMock(rows);
  // deno-lint-ignore no-explicit-any
  const out = await findNearbyServices(
    client as any,
    "train_station",
    undefined,
    10,
    -23.5247,
    -46.6147,
    100, // raio 100 m: a mais próxima (~300 m) já fica fora
    0,
    null,
    "Centro",
  );
  assertStringIncludes(out, "Não há estações de trem (CPTM) num raio de 100 m");
  assertStringIncludes(out, "Estação Proxima"); // ainda mostra a(s) mais próxima(s)
});

Deno.test("formatServicesWithContext: usa só \\n simples (sobrevive ao sanitize do app)", () => {
  const out = formatServicesWithContext(
    [
      { name: "Ponto A", district: "Centro", address: "Rua 1, 10" },
      { name: "Ponto B", district: "Centro", address: "Rua 2, 20" },
    ],
    "transit_station",
    null,
    true,
    "Av. Exemplo, 100",
  );
  // O sanitize do app colapsa 2+ espaços/quebras num espaço; só "\n" simples
  // sobrevive. O 📍 vem em linha própria (sem indentação) e o próximo item
  // numerado também — para a diagramação do chat quebrar um por linha.
  assertStringIncludes(out, "\n📍 Rua 1, 10");
  assertStringIncludes(out, "\n2. Ponto B");
  // Não pode haver "\n\n" nem indentação (seriam destruídos pelo sanitize).
  assertEquals(/\n\n/.test(out), false);
  assertEquals(/\n[ \t]/.test(out), false);
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
