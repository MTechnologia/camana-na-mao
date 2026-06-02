import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

import {
  __test__,
  useDiagnosticoCriticidade,
  type PatternEntry,
} from "./useDiagnosticoCriticidade";
import { supabase } from "@/integrations/supabase/client";

const { aggregate, computeScore, buildBreakdown, countPatternsForKey, normalizeVolumePercentile } =
  __test__;

interface RawReport {
  category: string;
  region: string;
  zone: string;
  isNegative: boolean;
  isCritical: boolean;
}

function rec(overrides: Partial<RawReport> = {}): RawReport {
  return {
    category: "Iluminação",
    region: "Tatuapé",
    zone: "Zona Leste",
    isNegative: false,
    isCritical: false,
    ...overrides,
  } as RawReport;
}

function pattern(overrides: Partial<PatternEntry> = {}): PatternEntry {
  return {
    id: "p1",
    description: "Buracos recorrentes na Zona Leste",
    occurrenceCount: 12,
    patternType: "geographic",
    status: "active",
    suggestedAction: "Inspeção da via",
    peakHours: [8, 18],
    firstDetectedAt: "2026-04-01T00:00:00Z",
    lastOccurrenceAt: "2026-05-01T00:00:00Z",
    avgSeverity: 0.7,
    averageSeverity: "alta",
    ...overrides,
  };
}

describe("computeScore", () => {
  it("retorna média ponderada arredondada com pesos iguais", () => {
    const score = computeScore({
      volumeScore: 100,
      negativeScore: 100,
      criticalScore: 100,
      patternScore: 100,
    });
    expect(score).toBe(100);
  });

  it("retorna 0 quando todos os componentes são 0", () => {
    const score = computeScore({
      volumeScore: 0,
      negativeScore: 0,
      criticalScore: 0,
      patternScore: 0,
    });
    expect(score).toBe(0);
  });

  it("limita score em 100 mesmo com componentes acima", () => {
    const score = computeScore({
      volumeScore: 200,
      negativeScore: 200,
      criticalScore: 200,
      patternScore: 200,
    });
    expect(score).toBe(100);
  });
});

describe("buildBreakdown", () => {
  it("calcula percentuais corretos com base em totais", () => {
    const b = buildBreakdown(10, 4, 2, 0, 50);
    expect(b.volumeScore).toBe(50);
    expect(b.negativeScore).toBe(40);
    expect(b.criticalScore).toBe(20);
    expect(b.patternScore).toBe(0);
  });

  it("normaliza patternScore em 0..5 padrões", () => {
    expect(buildBreakdown(10, 0, 0, 0, 0).patternScore).toBe(0);
    expect(buildBreakdown(10, 0, 0, 1, 0).patternScore).toBe(20);
    expect(buildBreakdown(10, 0, 0, 5, 0).patternScore).toBe(100);
    expect(buildBreakdown(10, 0, 0, 10, 0).patternScore).toBe(100); // limitado a 100
  });

  it("retorna zeros quando total é zero", () => {
    const b = buildBreakdown(0, 0, 0, 0, 0);
    expect(b.negativeScore).toBe(0);
    expect(b.criticalScore).toBe(0);
  });
});

describe("normalizeVolumePercentile", () => {
  it("retorna 100 para um valor único", () => {
    const m = normalizeVolumePercentile([42]);
    expect(m.get(42)).toBe(100);
  });

  it("retorna percentis crescentes para valores ordenados", () => {
    const m = normalizeVolumePercentile([1, 2, 3, 4]);
    const p1 = m.get(1)!;
    const p4 = m.get(4)!;
    expect(p1).toBeLessThan(p4);
    expect(p1).toBeGreaterThan(0);
    expect(p4).toBeLessThanOrEqual(100);
  });

  it("retorna mapa vazio para entrada vazia", () => {
    expect(normalizeVolumePercentile([]).size).toBe(0);
  });
});

describe("countPatternsForKey", () => {
  it("conta padrões cuja descrição inclui a chave (case insensitive)", () => {
    const patterns = [
      pattern({ id: "1", description: "Buracos na Zona Leste" }),
      pattern({ id: "2", description: "BURACOS na Zona Sul" }),
      pattern({ id: "3", description: "Iluminação na Zona Norte" }),
    ];
    expect(countPatternsForKey("Zona Leste", patterns)).toBe(1);
    expect(countPatternsForKey("buracos", patterns)).toBe(2);
    expect(countPatternsForKey("inexistente", patterns)).toBe(0);
  });

  it("retorna 0 com chave vazia", () => {
    expect(countPatternsForKey("", [pattern()])).toBe(0);
  });

  it("retorna 0 com lista vazia", () => {
    expect(countPatternsForKey("foo", [])).toBe(0);
  });
});

describe("aggregate", () => {
  it("retorna stats vazias com inputs vazios", () => {
    const r = aggregate([], []);
    expect(r.totalRecords).toBe(0);
    expect(r.totalPatterns).toBe(0);
    expect(r.topCategories).toEqual([]);
    expect(r.topRegions).toEqual([]);
    expect(r.globalScore).toBe(0);
  });

  it("calcula totals e categoriza corretamente", () => {
    const records = [
      rec({ category: "A", isNegative: true }),
      rec({ category: "A", isCritical: true }),
      rec({ category: "B" }),
    ];
    const r = aggregate(records, []);
    expect(r.totalRecords).toBe(3);
    expect(r.totalNegative).toBe(1);
    expect(r.totalCritical).toBe(1);
    expect(r.topCategories.find((c) => c.category === "A")?.total).toBe(2);
  });

  it("ranqueia top categorias por score combinado", () => {
    // A: 10 relatos, 80% negativo - deve ter score alto
    // B: 2 relatos, 0% negativo - deve ter score mais baixo
    const records = [
      ...Array.from({ length: 8 }, () => rec({ category: "A", isNegative: true })),
      ...Array.from({ length: 2 }, () => rec({ category: "A" })),
      rec({ category: "B" }),
      rec({ category: "B" }),
    ];
    const r = aggregate(records, []);
    expect(r.topCategories[0].category).toBe("A");
    expect(r.topCategories[0].score).toBeGreaterThan(r.topCategories[1].score);
  });

  it("considera padrões ativos por chave da categoria", () => {
    const records = [rec({ category: "Iluminação" })];
    const patterns = [pattern({ description: "Lâmpadas queimadas em Iluminação pública" })];
    const r = aggregate(records, patterns);
    expect(r.topCategories[0].patternsActive).toBe(1);
  });

  it("agrupa zonas com mais relatos no topo", () => {
    const records = [
      ...Array.from({ length: 5 }, () => rec({ zone: "Zona Leste" })),
      rec({ zone: "Zona Norte" }),
    ];
    const r = aggregate(records, []);
    expect(r.topRegions[0].zone).toBe("Zona Leste");
    expect(r.topRegions[0].total).toBe(5);
  });

  it("retorna no máximo 10 padrões em topPatterns", () => {
    const patterns = Array.from({ length: 15 }, (_, i) =>
      pattern({ id: `p${i}`, occurrenceCount: 100 - i }),
    );
    const r = aggregate([rec()], patterns);
    expect(r.topPatterns).toHaveLength(10);
    expect(r.totalPatterns).toBe(15);
  });
});

interface MockChain {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
}

function chain(result: { data: unknown; error: unknown }): MockChain {
  const c = {} as MockChain;
  const promise = Promise.resolve(result);
  c.select = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.order = vi.fn().mockReturnValue(c);
  c.range = vi.fn().mockResolvedValue(result);
  c.limit = vi.fn().mockReturnValue(promise);
  c.gte = vi.fn().mockReturnValue(c);
  c.lte = vi.fn().mockReturnValue(c);
  return c;
}

type SupabaseFrom = typeof supabase.from;

describe("useDiagnosticoCriticidade (hook)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("integra dados das três fontes e retorna stats consolidadas", async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === "urban_reports") {
        return chain({
          data: [
            {
              category: "Iluminação",
              neighborhood: "Tatuapé",
              severity: "crítico",
              ai_classification: { sentiment: "negativo" },
            },
          ],
          error: null,
        });
      }
      if (table === "transport_reports") {
        return chain({
          data: [
            {
              report_type: "ônibus",
              sub_category: "Atraso",
              location: "Pinheiros",
              stop_location: null,
              severity: "alta",
              ai_sentiment: "negativo",
            },
          ],
          error: null,
        });
      }
      if (table === "report_patterns") {
        return chain({
          data: [
            {
              id: "p1",
              description: "Padrão de teste",
              occurrence_count: 5,
              pattern_type: "geographic",
              status: "active",
              suggested_action: "Tomar uma ação",
              peak_hours: [8, 17],
              first_detected_at: "2026-04-01T00:00:00Z",
              last_occurrence_at: "2026-05-01T00:00:00Z",
              avg_severity: 0.6,
              average_severity: "alta",
            },
          ],
          error: null,
        });
      }
      return chain({ data: [], error: null });
    });

    vi.spyOn(supabase, "from").mockImplementation(fromMock as unknown as SupabaseFrom);

    const { result } = renderHook(() => useDiagnosticoCriticidade({}));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.stats.totalRecords).toBe(2);
    expect(result.current.stats.totalNegative).toBe(2);
    expect(result.current.stats.totalCritical).toBe(2);
    expect(result.current.stats.totalPatterns).toBe(1);
    expect(result.current.stats.topPatterns).toHaveLength(1);
  });

  it("propaga erro de Supabase no estado de erro", async () => {
    const errorImpl = (_table: string) => chain({ data: null, error: { message: "boom" } });
    vi.spyOn(supabase, "from").mockImplementation(errorImpl as unknown as SupabaseFrom);

    const { result } = renderHook(() => useDiagnosticoCriticidade({}));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toMatch(/Não foi possível carregar/i);
    expect(result.current.stats.totalRecords).toBe(0);
  });
});
