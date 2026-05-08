import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

import { __test__ } from "./useIntensityDemand";

const { compositeWaitHours, aggregateByZone, parsePgInterval } = __test__;

const HOUR = 3600 * 1000;

interface RawReport {
  source: "urban" | "transport";
  zone: string;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  respondedAt: string | null;
  firstResponseSeconds: number | null;
}

function rep(over: Partial<RawReport> = {}): RawReport {
  return {
    source: "urban",
    zone: "Centro",
    status: "resolved",
    createdAt: new Date(Date.now() - 48 * HOUR).toISOString(),
    updatedAt: new Date(Date.now() - 24 * HOUR).toISOString(),
    respondedAt: null,
    firstResponseSeconds: null,
    ...over,
  };
}

describe("compositeWaitHours", () => {
  it("retorna null para relato sem dados de tempo", () => {
    expect(
      compositeWaitHours(rep({ status: null, createdAt: null, updatedAt: null })),
    ).toBeNull();
  });

  it("usa apenas tempo de resolução quando status=resolved e sem firstResponse", () => {
    const r = rep({
      status: "resolved",
      createdAt: new Date(Date.now() - 24 * HOUR).toISOString(),
      updatedAt: new Date(Date.now() - 0 * HOUR).toISOString(),
    });
    const wait = compositeWaitHours(r);
    expect(wait).not.toBeNull();
    expect(wait!).toBeCloseTo(24, 0);
  });

  it("redistribui pesos quando só uma das parcelas existe", () => {
    // Resolved com 10h, sem first_response, sem pending → resultado deve ser 10h
    const r = rep({
      status: "resolved",
      createdAt: new Date(Date.now() - 10 * HOUR).toISOString(),
      updatedAt: new Date(Date.now() - 0 * HOUR).toISOString(),
    });
    expect(compositeWaitHours(r)).toBeCloseTo(10, 0);
  });

  it("inclui pending para relatos abertos", () => {
    const r = rep({
      status: "pending",
      createdAt: new Date(Date.now() - 36 * HOUR).toISOString(),
      updatedAt: null,
    });
    // Só pending available → 36h
    expect(compositeWaitHours(r)).toBeCloseTo(36, 0);
  });

  it("usa firstResponseSeconds quando disponível (transport)", () => {
    const r = rep({
      source: "transport",
      status: "resolved",
      createdAt: new Date(Date.now() - 5 * HOUR).toISOString(),
      updatedAt: new Date(Date.now() - 1 * HOUR).toISOString(),
      firstResponseSeconds: 7200, // 2h
    });
    // resolved=4h, firstResp=2h → ponderado: (4*0.5 + 2*0.3) / 0.8 = 3.25
    const wait = compositeWaitHours(r);
    expect(wait).toBeCloseTo(3.25, 1);
  });

  it("não conta tempo pendente quando status é rejeitado", () => {
    const r = rep({
      status: "rejected",
      createdAt: new Date(Date.now() - 100 * HOUR).toISOString(),
      updatedAt: null,
    });
    expect(compositeWaitHours(r)).toBeNull();
  });
});

describe("aggregateByZone", () => {
  it("retorna lista vazia para input vazio", () => {
    expect(aggregateByZone([])).toEqual([]);
  });

  it("agrega por zona somando volume", () => {
    const reports = [
      rep({ zone: "Centro" }),
      rep({ zone: "Centro" }),
      rep({ zone: "Zona Norte" }),
    ];
    const result = aggregateByZone(reports);
    const centro = result.find((z) => z.zone === "Centro");
    expect(centro?.count).toBe(2);
    const norte = result.find((z) => z.zone === "Zona Norte");
    expect(norte?.count).toBe(1);
  });

  it("calcula tempo médio composto", () => {
    const reports = [
      rep({
        zone: "Centro",
        status: "resolved",
        createdAt: new Date(Date.now() - 10 * HOUR).toISOString(),
        updatedAt: new Date(Date.now() - 0 * HOUR).toISOString(),
      }),
      rep({
        zone: "Centro",
        status: "resolved",
        createdAt: new Date(Date.now() - 20 * HOUR).toISOString(),
        updatedAt: new Date(Date.now() - 0 * HOUR).toISOString(),
      }),
    ];
    const result = aggregateByZone(reports);
    const c = result.find((z) => z.zone === "Centro");
    expect(c?.avgWaitHours).toBeCloseTo(15, 0);
  });

  it("conta resolved/pending/rejected", () => {
    const reports = [
      rep({ zone: "Centro", status: "resolved" }),
      rep({ zone: "Centro", status: "pending" }),
      rep({ zone: "Centro", status: "rejected" }),
    ];
    const c = aggregateByZone(reports).find((z) => z.zone === "Centro")!;
    expect(c.resolved).toBe(1);
    expect(c.pending).toBe(1);
    expect(c.rejected).toBe(1);
  });

  it("ignora zonas sem centroide (Não informada)", () => {
    const reports = [rep({ zone: "Não informada" }), rep({ zone: "Centro" })];
    const result = aggregateByZone(reports);
    expect(result.find((z) => z.zone === "Não informada")).toBeUndefined();
    expect(result.find((z) => z.zone === "Centro")).toBeDefined();
  });

  it("ordena por priorityScore descendente", () => {
    const reports = [
      rep({ zone: "Centro", createdAt: new Date(Date.now() - 5 * HOUR).toISOString() }),
      rep({ zone: "Zona Norte", createdAt: new Date(Date.now() - 200 * HOUR).toISOString() }),
      rep({ zone: "Zona Norte", createdAt: new Date(Date.now() - 200 * HOUR).toISOString() }),
      rep({ zone: "Zona Norte", createdAt: new Date(Date.now() - 200 * HOUR).toISOString() }),
    ];
    const result = aggregateByZone(reports);
    expect(result[0].priorityScore).toBeGreaterThanOrEqual(result[1].priorityScore);
  });
});

describe("parsePgInterval", () => {
  it("aceita number e retorna o valor", () => {
    expect(parsePgInterval(3600)).toBe(3600);
  });

  it("parsea formato HH:MM:SS", () => {
    expect(parsePgInterval("01:30:00")).toBe(5400);
    expect(parsePgInterval("00:00:30")).toBe(30);
  });

  it("parsea formato com days", () => {
    expect(parsePgInterval("2 days 03:00:00")).toBe(2 * 86400 + 3 * 3600);
    expect(parsePgInterval("1 day 00:30:00")).toBe(86400 + 1800);
  });

  it("aceita objeto pg interval", () => {
    expect(parsePgInterval({ hours: 2, minutes: 30, seconds: 0 })).toBe(2 * 3600 + 30 * 60);
    expect(parsePgInterval({ days: 1, seconds: 45 })).toBe(86400 + 45);
  });

  it("retorna null para entradas inválidas", () => {
    expect(parsePgInterval(null)).toBeNull();
    expect(parsePgInterval(undefined)).toBeNull();
    expect(parsePgInterval("xyz")).toBeNull();
    expect(parsePgInterval(0)).toBeNull();
  });
});
