import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { __test__, useTerritorialDrill } from "./useTerritorialDrill";
import { supabase } from "@/integrations/supabase/client";
import type { ZonaVolumeOuDesconhecida } from "@/lib/regionMapping";

const { aggregate, levelOf, nextLevelOf, inScope, computeCriticidadeScore } = __test__;

interface RawReport {
  source: "urbano" | "transporte" | "avaliacao";
  category: string;
  zone: ZonaVolumeOuDesconhecida;
  neighborhood: string;
  street: string;
  isResolved: boolean;
  isNegative: boolean;
  isCritical: boolean;
}

function rec(overrides: Partial<RawReport> = {}): RawReport {
  return {
    source: "urbano",
    category: "Iluminação",
    zone: "Zona Leste" as ZonaVolumeOuDesconhecida,
    neighborhood: "Tatuapé",
    street: "Rua A",
    isResolved: false,
    isNegative: false,
    isCritical: false,
    ...overrides,
  };
}

describe("levelOf / nextLevelOf", () => {
  it("levelOf identifica corretamente o nível atual", () => {
    expect(levelOf({})).toBe("zona");
    expect(levelOf({ zona: "Zona Leste" })).toBe("bairro");
    expect(levelOf({ zona: "Zona Leste", bairro: "Tatuapé" })).toBe("rua");
    expect(levelOf({ zona: "Zona Leste", bairro: "Tatuapé", rua: "Rua A" })).toBe("rua");
  });

  it("nextLevelOf retorna o próximo nível ou null no fim", () => {
    expect(nextLevelOf("zona")).toBe("bairro");
    expect(nextLevelOf("bairro")).toBe("rua");
    expect(nextLevelOf("rua")).toBeNull();
  });
});

describe("inScope", () => {
  it("aceita registro quando posição é vazia", () => {
    expect(inScope(rec(), {})).toBe(true);
  });
  it("filtra por zona", () => {
    expect(inScope(rec({ zone: "Zona Leste" }), { zona: "Zona Leste" })).toBe(true);
    expect(inScope(rec({ zone: "Zona Leste" }), { zona: "Zona Norte" })).toBe(false);
  });
  it("filtra por bairro dentro da zona", () => {
    expect(
      inScope(rec({ neighborhood: "Tatuapé" }), {
        zona: "Zona Leste",
        bairro: "Tatuapé",
      }),
    ).toBe(true);
    expect(
      inScope(rec({ neighborhood: "Penha" }), {
        zona: "Zona Leste",
        bairro: "Tatuapé",
      }),
    ).toBe(false);
  });
  it("filtra por rua dentro do bairro", () => {
    expect(
      inScope(rec({ street: "Rua A" }), {
        zona: "Zona Leste",
        bairro: "Tatuapé",
        rua: "Rua A",
      }),
    ).toBe(true);
    expect(
      inScope(rec({ street: "Rua B" }), {
        zona: "Zona Leste",
        bairro: "Tatuapé",
        rua: "Rua A",
      }),
    ).toBe(false);
  });
});

describe("computeCriticidadeScore", () => {
  it("retorna 0 quando não há registros", () => {
    const r = computeCriticidadeScore(0, 0, 0, 0);
    expect(r.score).toBe(0);
    expect(r.breakdown.negativePct).toBe(0);
    expect(r.breakdown.criticalPct).toBe(0);
  });

  it("calcula percentuais corretos", () => {
    const r = computeCriticidadeScore(10, 4, 2, 0);
    expect(r.breakdown.negativePct).toBe(40);
    expect(r.breakdown.criticalPct).toBe(20);
    // volume=100, neg=40, crit=20, pat=0 → (100+40+20+0)/4 = 40
    expect(r.score).toBe(40);
  });

  it("limita patternProxy em 100", () => {
    const r = computeCriticidadeScore(10, 0, 0, 500);
    expect(r.breakdown.patternProxy).toBe(100);
  });

  it("score sempre 0-100", () => {
    const r = computeCriticidadeScore(10, 100, 100, 1000);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

describe("aggregate", () => {
  it("retorna stats vazias quando não há registros", () => {
    const r = aggregate([], {});
    expect(r.total).toBe(0);
    expect(r.criticidadeScore).toBe(0);
  });

  it("nível raiz mostra todas as zonas como nextItems com nextLevel='zona'", () => {
    const records = [
      rec({ zone: "Zona Leste" as ZonaVolumeOuDesconhecida }),
      rec({ zone: "Zona Norte" as ZonaVolumeOuDesconhecida }),
    ];
    const r = aggregate(records, {});
    expect(r.currentLevel).toBe("zona");
    // Na raiz, o "próximo passo" é selecionar uma zona (não bairro)
    expect(r.nextLevel).toBe("zona");
    // Lista deve incluir as 5 zonas + Não informada (com count 0 mantidos)
    const labels = r.nextItems.map((n) => n.label);
    expect(labels).toContain("Zona Leste");
    expect(labels).toContain("Zona Norte");
    expect(labels).toContain("Zona Sul");
  });

  it("descer para zona reduz escopo e mostra bairros", () => {
    const records = [
      rec({ zone: "Zona Leste" as ZonaVolumeOuDesconhecida, neighborhood: "Tatuapé" }),
      rec({ zone: "Zona Leste" as ZonaVolumeOuDesconhecida, neighborhood: "Penha" }),
      rec({ zone: "Zona Norte" as ZonaVolumeOuDesconhecida, neighborhood: "Santana" }),
    ];
    const r = aggregate(records, { zona: "Zona Leste" });
    expect(r.total).toBe(2);
    expect(r.nextLevel).toBe("rua");
    const labels = r.nextItems.map((n) => n.label);
    expect(labels).toContain("Tatuapé");
    expect(labels).toContain("Penha");
    expect(labels).not.toContain("Santana");
  });

  it("descer para bairro mostra ruas", () => {
    const records = [
      rec({ neighborhood: "Tatuapé", street: "Rua A" }),
      rec({ neighborhood: "Tatuapé", street: "Rua A" }),
      rec({ neighborhood: "Tatuapé", street: "Rua B" }),
    ];
    const r = aggregate(records, { zona: "Zona Leste", bairro: "Tatuapé" });
    expect(r.total).toBe(3);
    expect(r.nextLevel).toBe("rua");
    const ruaA = r.nextItems.find((n) => n.label === "Rua A");
    expect(ruaA?.count).toBe(2);
  });

  it("nível rua é folha (sem nextLevel)", () => {
    const records = [rec({ street: "Rua A" })];
    const r = aggregate(records, { zona: "Zona Leste", bairro: "Tatuapé", rua: "Rua A" });
    expect(r.nextLevel).toBeNull();
    expect(r.nextItems).toEqual([]);
  });

  it("bairro vira folha quando todas as ruas são 'Não informada'", () => {
    const records = [
      rec({ neighborhood: "Tatuapé", street: "Não informada" }),
      rec({ neighborhood: "Tatuapé", street: "Não informada" }),
    ];
    const r = aggregate(records, { zona: "Zona Leste", bairro: "Tatuapé" });
    expect(r.currentLevel).toBe("bairro");
    expect(r.nextLevel).toBeNull(); // bairro virou folha porque não há ruas válidas
    expect(r.nextItems).toEqual([]);
  });

  it("filtra 'Não informada' do nextItems no nível rua, mantendo ruas válidas", () => {
    const records = [
      rec({ neighborhood: "Tatuapé", street: "Rua A" }),
      rec({ neighborhood: "Tatuapé", street: "Rua A" }),
      rec({ neighborhood: "Tatuapé", street: "Não informada" }),
      rec({ neighborhood: "Tatuapé", street: "Não informada" }),
      rec({ neighborhood: "Tatuapé", street: "Não informada" }),
    ];
    const r = aggregate(records, { zona: "Zona Leste", bairro: "Tatuapé" });
    expect(r.nextLevel).toBe("rua");
    const labels = r.nextItems.map((n) => n.label);
    expect(labels).toContain("Rua A");
    expect(labels).not.toContain("Não informada");
    // Total continua sendo 5 (todos os registros do bairro)
    expect(r.total).toBe(5);
  });

  it("calcula breakdown por tipo (urbano/transporte/avaliacao)", () => {
    const records = [
      rec({ source: "urbano" }),
      rec({ source: "transporte" }),
      rec({ source: "transporte" }),
      rec({ source: "avaliacao" }),
    ];
    const r = aggregate(records, {});
    expect(r.urbano).toBe(1);
    expect(r.transporte).toBe(2);
    expect(r.avaliacao).toBe(1);
    expect(r.total).toBe(4);
  });

  it("calcula taxa de resolução", () => {
    const records = [
      rec({ isResolved: true }),
      rec({ isResolved: true }),
      rec({ isResolved: false }),
    ];
    const r = aggregate(records, {});
    expect(r.resolved).toBe(2);
    expect(r.resolutionPct).toBe(67);
  });

  it("topCategorias retorna até 5 ordenadas por count", () => {
    const records = [
      rec({ category: "A" }),
      rec({ category: "A" }),
      rec({ category: "B" }),
      rec({ category: "C" }),
      rec({ category: "D" }),
      rec({ category: "E" }),
      rec({ category: "F" }),
    ];
    const r = aggregate(records, {});
    expect(r.topCategories).toHaveLength(5);
    expect(r.topCategories[0].category).toBe("A");
    expect(r.topCategories[0].count).toBe(2);
  });

  it("scoreCriticidade reflete % negativo e crítico", () => {
    const records = [
      rec({ isNegative: true, isCritical: true }),
      rec({ isNegative: true, isCritical: false }),
      rec({ isNegative: false, isCritical: false }),
      rec({ isNegative: false, isCritical: false }),
    ];
    const r = aggregate(records, {});
    expect(r.scoreBreakdown.negativePct).toBe(50);
    expect(r.scoreBreakdown.criticalPct).toBe(25);
    expect(r.criticidadeScore).toBeGreaterThan(0);
  });
});

interface MockChain {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
}

function chain(result: { data: unknown; error: unknown }): MockChain {
  const c = {} as MockChain;
  c.select = vi.fn().mockReturnValue(c);
  c.order = vi.fn().mockReturnValue(c);
  c.range = vi.fn().mockResolvedValue(result);
  return c;
}

type SupabaseFrom = typeof supabase.from;

describe("useTerritorialDrill (hook)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("integra dados das três fontes e retorna stats agregadas", async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === "urban_reports") {
        return chain({
          data: [
            {
              category: "Iluminação",
              neighborhood: "Tatuapé",
              street: "Rua A",
              status: "resolved",
              severity: "alta",
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
              status: "pending",
              severity: "média",
              ai_sentiment: null,
            },
          ],
          error: null,
        });
      }
      if (table === "urban_reports") {
        return chain({
          data: [
            {
              category: "Iluminação",
              neighborhood: "Tatuapé",
              street: "Rua A",
              status: "resolved",
              severity: "alta",
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
              status: "pending",
              severity: "média",
              ai_sentiment: null,
            },
          ],
          error: null,
        });
      }
      if (table === "service_ratings") {
        return chain({
          data: [
            {
              public_services: {
                service_type: "saúde",
                district: "Penha",
                address: "Av X, 100",
              },
            },
          ],
          error: null,
        });
      }
      return chain({ data: [], error: null });
    });

    vi.spyOn(supabase, "from").mockImplementation(fromMock as unknown as SupabaseFrom);

    const { result } = renderHook(() => useTerritorialDrill({}));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.stats.total).toBe(3);
    expect(result.current.stats.urbano).toBe(1);
    expect(result.current.stats.transporte).toBe(1);
    expect(result.current.stats.avaliacao).toBe(1);
  });

  it("propaga erro de Supabase no estado de erro", async () => {
    const errorImpl = (_table: string) => chain({ data: null, error: { message: "boom" } });
    vi.spyOn(supabase, "from").mockImplementation(errorImpl as unknown as SupabaseFrom);

    const { result } = renderHook(() => useTerritorialDrill({}));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toMatch(/Não foi possível carregar/i);
    expect(result.current.stats.total).toBe(0);
  });
});
