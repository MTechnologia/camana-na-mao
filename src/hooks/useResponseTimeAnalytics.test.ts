import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import {
  __test__,
  useResponseTimeAnalytics,
  type EfficiencySource,
} from "./useResponseTimeAnalytics";
import { supabase } from "@/integrations/supabase/client";

const { aggregate, buildBreakdown, diffHours, median, previousWindow } = __test__;

interface ResolvedRecord {
  source: EfficiencySource;
  createdAt: string;
  resolvedAt: string;
  hours: number;
  category: string;
  severity: string;
  region: string;
  zone: string;
}

function rec(overrides: Partial<ResolvedRecord> = {}): ResolvedRecord {
  return {
    source: "urbano",
    createdAt: "2026-04-01T10:00:00Z",
    resolvedAt: "2026-04-01T22:00:00Z",
    hours: 12,
    category: "Iluminação",
    severity: "alta",
    region: "Tatuapé",
    zone: "Zona Leste",
    ...overrides,
  } as ResolvedRecord;
}

describe("helpers", () => {
  it("diffHours calcula horas com precisão entre duas ISO strings", () => {
    const h = diffHours("2026-04-01T10:00:00Z", "2026-04-02T10:00:00Z");
    expect(h).toBe(24);
  });

  it("diffHours retorna 0 quando end < start (proteção contra dados sujos)", () => {
    expect(diffHours("2026-04-02T10:00:00Z", "2026-04-01T10:00:00Z")).toBe(0);
  });

  it("median funciona para tamanhos pares e ímpares", () => {
    expect(median([])).toBe(0);
    expect(median([10])).toBe(10);
    expect(median([1, 5, 9])).toBe(5);
    expect(median([2, 4, 6, 8])).toBe(5); // (4+6)/2
  });

  it("previousWindow retorna janela imediatamente anterior de mesma duração", () => {
    const { startIso, endIso } = previousWindow(
      "2026-04-15T00:00:00Z",
      "2026-04-22T00:00:00Z",
    );
    expect(endIso).toBeTruthy();
    expect(startIso).toBeTruthy();
    // duração ≈ 7 dias = 604800000 ms; janela anterior deve ter ≈ mesma duração
    const dur = new Date(endIso!).getTime() - new Date(startIso!).getTime();
    expect(Math.abs(dur - 7 * 24 * 60 * 60 * 1000)).toBeLessThan(2000);
  });

  it("buildBreakdown agrega média e contagem por chave, ordena por avgHours desc", () => {
    const data = [
      rec({ category: "A", hours: 10 }),
      rec({ category: "A", hours: 20 }),
      rec({ category: "B", hours: 5 }),
    ];
    const result = buildBreakdown(data, (r) => r.category);
    expect(result).toEqual([
      { label: "A", avgHours: 15, count: 2 },
      { label: "B", avgHours: 5, count: 1 },
    ]);
  });

  it("buildBreakdown ignora chaves listadas em excludeEmpty", () => {
    const data = [
      rec({ severity: "alta", hours: 10 }),
      rec({ severity: "—", hours: 30 }),
    ];
    const result = buildBreakdown(data, (r) => r.severity, ["—"]);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("alta");
  });
});

describe("aggregate", () => {
  it("retorna stats vazias com inputs vazios", () => {
    const r = aggregate([], []);
    expect(r.count).toBe(0);
    expect(r.avgHours).toBe(0);
    expect(r.direction).toBe("estavel");
  });

  it("calcula avgHours, mediana, count e trend diário", () => {
    const records = [
      rec({ resolvedAt: "2026-04-01T10:00:00Z", hours: 10 }),
      rec({ resolvedAt: "2026-04-01T12:00:00Z", hours: 20 }),
      rec({ resolvedAt: "2026-04-02T08:00:00Z", hours: 30 }),
    ];
    const r = aggregate(records, []);
    expect(r.count).toBe(3);
    expect(r.avgHours).toBe(20);
    expect(r.medianHours).toBe(20);
    expect(r.trend).toHaveLength(2);
    expect(r.trend[0].date).toBe("2026-04-01");
    expect(r.trend[0].avgHours).toBe(15);
    expect(r.trend[0].count).toBe(2);
  });

  it("calcula deltaPct e direction comparando com período anterior", () => {
    const current = [rec({ hours: 10 }), rec({ hours: 10 })];
    const previous = [rec({ hours: 20 }), rec({ hours: 20 })];
    const r = aggregate(current, previous);
    expect(r.avgHours).toBe(10);
    expect(r.avgHoursPrevious).toBe(20);
    expect(r.deltaPct).toBeCloseTo(-50, 5);
    expect(r.direction).toBe("melhorou");
  });

  it("direction é 'piorou' quando atual > anterior", () => {
    const r = aggregate([rec({ hours: 30 })], [rec({ hours: 10 })]);
    expect(r.direction).toBe("piorou");
  });

  it("direction é 'estavel' para variações <= 1%", () => {
    const r = aggregate([rec({ hours: 10.05 })], [rec({ hours: 10 })]);
    expect(r.direction).toBe("estavel");
  });

  it("direction é 'estavel' quando não há período anterior", () => {
    const r = aggregate([rec({ hours: 10 })], []);
    expect(r.direction).toBe("estavel");
    expect(r.deltaPct).toBe(0);
  });

  it("byType ordena por count desc e usa o source da record", () => {
    const records = [
      rec({ source: "urbano" }),
      rec({ source: "transporte" }),
      rec({ source: "transporte" }),
      rec({ source: "encaminhamento" }),
    ];
    const r = aggregate(records, []);
    expect(r.byType[0].source).toBe("transporte");
    expect(r.byType[0].count).toBe(2);
  });

  it("byRegion agrupa por zona da cidade (não bairro literal)", () => {
    const records = [
      rec({ region: "Tatuapé", zone: "Zona Leste" }),
      rec({ region: "Penha", zone: "Zona Leste" }),
      rec({ region: "Pinheiros", zone: "Zona Oeste" }),
    ];
    const r = aggregate(records, []);
    const labels = r.byRegion.map((x) => x.label);
    expect(labels).toContain("Zona Leste");
    expect(labels).toContain("Zona Oeste");
    expect(r.byRegion.find((x) => x.label === "Zona Leste")?.count).toBe(2);
  });
});

interface MockChain {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
}

function chain(result: { data: unknown; error: unknown }): MockChain {
  const c = {} as MockChain;
  c.select = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.not = vi.fn().mockReturnValue(c);
  c.order = vi.fn().mockReturnValue(c);
  c.range = vi.fn().mockResolvedValue(result);
  c.gte = vi.fn().mockReturnValue(c);
  c.lte = vi.fn().mockReturnValue(c);
  return c;
}

type SupabaseFrom = typeof supabase.from;

describe("useResponseTimeAnalytics (hook)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("integra dados das três fontes e calcula stats", async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === "urban_reports") {
        return chain({
          data: [
            {
              created_at: "2026-04-01T10:00:00Z",
              updated_at: "2026-04-01T22:00:00Z",
              status: "resolved",
              category: "Iluminação",
              severity: "alta",
              neighborhood: "Tatuapé",
            },
          ],
          error: null,
        });
      }
      if (table === "transport_reports") {
        return chain({
          data: [
            {
              created_at: "2026-04-02T08:00:00Z",
              updated_at: "2026-04-02T20:00:00Z",
              status: "resolved",
              report_type: "ônibus",
              sub_category: "Atraso",
              severity: "alta",
              location: "Pinheiros",
              stop_location: null,
            },
          ],
          error: null,
        });
      }
      if (table === "council_member_referrals") {
        return chain({
          data: [
            {
              sent_at: "2026-04-03T08:00:00Z",
              created_at: "2026-04-03T08:00:00Z",
              resolved_at: "2026-04-04T08:00:00Z",
              council_member_party: "PT",
            },
          ],
          error: null,
        });
      }
      return chain({ data: [], error: null });
    });

    vi.spyOn(supabase, "from").mockImplementation(fromMock as unknown as SupabaseFrom);

    const { result } = renderHook(() => useResponseTimeAnalytics({}));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.stats.count).toBe(3);
    expect(result.current.stats.avgHours).toBeGreaterThan(0);
    expect(result.current.stats.byType.map((t) => t.source).sort()).toEqual([
      "encaminhamento",
      "transporte",
      "urbano",
    ]);
  });

  it("propaga erro de Supabase no estado de erro", async () => {
    const errorImpl = (_table: string) => chain({ data: null, error: { message: "boom" } });
    vi.spyOn(supabase, "from").mockImplementation(errorImpl as unknown as SupabaseFrom);

    const { result } = renderHook(() => useResponseTimeAnalytics({}));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toMatch(/Não foi possível carregar/i);
    expect(result.current.stats.count).toBe(0);
  });
});
