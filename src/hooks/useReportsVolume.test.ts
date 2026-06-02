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
  useReportsVolume,
  type ReportsVolumeFilters,
} from "./useReportsVolume";
import { supabase } from "@/integrations/supabase/client";

const { aggregate } = __test__;

interface RawReportInput {
  source: "urbano" | "transporte" | "avaliacao";
  createdAt: string | null;
  category: string;
  region: string;
}

describe("useReportsVolume / aggregate", () => {
  it("retorna stats vazios quando rows está vazio", () => {
    const stats = aggregate([], {});
    expect(stats.total).toBe(0);
    expect(stats.timeline).toEqual([]);
    expect(stats.byCategory).toEqual([]);
    expect(stats.byRegion).toEqual([]);
    expect(stats.byZone).toEqual([]);
  });

  it("agrega total e contagens por tipo (urbano/transporte/avaliacao)", () => {
    const rows: RawReportInput[] = [
      { source: "urbano", createdAt: "2026-05-01T10:00:00Z", category: "Iluminação", region: "Tatuapé" },
      { source: "urbano", createdAt: "2026-05-01T11:00:00Z", category: "Iluminação", region: "Tatuapé" },
      { source: "transporte", createdAt: "2026-05-02T09:00:00Z", category: "Linha de ônibus", region: "Sé" },
      { source: "avaliacao", createdAt: "2026-05-03T14:00:00Z", category: "Saúde", region: "Pinheiros" },
    ];

    const stats = aggregate(rows, {});
    expect(stats.total).toBe(4);
    expect(stats.urbano).toBe(2);
    expect(stats.transporte).toBe(1);
    expect(stats.avaliacao).toBe(1);
  });

  it("agrupa timeline por dia e separa por tipo", () => {
    const rows: RawReportInput[] = [
      { source: "urbano", createdAt: "2026-05-01T10:00:00Z", category: "A", region: "X" },
      { source: "urbano", createdAt: "2026-05-01T11:00:00Z", category: "A", region: "X" },
      { source: "transporte", createdAt: "2026-05-01T15:00:00Z", category: "B", region: "Y" },
      { source: "avaliacao", createdAt: "2026-05-02T08:00:00Z", category: "C", region: "Z" },
    ];

    const stats = aggregate(rows, {});
    expect(stats.timeline).toHaveLength(2);
    const day1 = stats.timeline[0];
    expect(day1.date).toBe("2026-05-01");
    expect(day1.urbano).toBe(2);
    expect(day1.transporte).toBe(1);
    expect(day1.avaliacao).toBe(0);
    expect(day1.total).toBe(3);
    const day2 = stats.timeline[1];
    expect(day2.date).toBe("2026-05-02");
    expect(day2.avaliacao).toBe(1);
    expect(day2.total).toBe(1);
  });

  it("filtra por categoria preservando o universo de categorias disponíveis", () => {
    const rows: RawReportInput[] = [
      { source: "urbano", createdAt: "2026-05-01T10:00:00Z", category: "Iluminação", region: "Tatuapé" },
      { source: "urbano", createdAt: "2026-05-01T10:00:00Z", category: "Buraco", region: "Sé" },
      { source: "transporte", createdAt: "2026-05-01T10:00:00Z", category: "Linha de ônibus", region: "Sé" },
    ];

    const filters: ReportsVolumeFilters = { categories: ["Iluminação"] };
    const stats = aggregate(rows, filters);

    expect(stats.total).toBe(1);
    expect(stats.byCategory).toEqual([
      { category: "Iluminação", count: 1, source: "urbano" },
    ]);
    expect(stats.availableCategories).toEqual(
      expect.arrayContaining(["Iluminação", "Buraco", "Linha de ônibus"]),
    );
  });

  it("filtra por região (bairro)", () => {
    const rows: RawReportInput[] = [
      { source: "urbano", createdAt: "2026-05-01T10:00:00Z", category: "A", region: "Tatuapé" },
      { source: "urbano", createdAt: "2026-05-01T10:00:00Z", category: "A", region: "Sé" },
    ];
    const stats = aggregate(rows, { regions: ["Sé"] });
    expect(stats.total).toBe(1);
    expect(stats.byRegion[0].region).toBe("Sé");
  });

  it("filtra por zona derivada do bairro", () => {
    const rows: RawReportInput[] = [
      { source: "urbano", createdAt: "2026-05-01T10:00:00Z", category: "A", region: "Tatuapé" },
      { source: "urbano", createdAt: "2026-05-01T10:00:00Z", category: "A", region: "Pinheiros" },
      { source: "urbano", createdAt: "2026-05-01T10:00:00Z", category: "A", region: "Sé" },
    ];
    const stats = aggregate(rows, { zones: ["Zona Leste"] });
    expect(stats.total).toBe(1);
    expect(stats.byRegion[0].region).toBe("Tatuapé");
    expect(stats.byRegion[0].zone).toBe("Zona Leste");
  });

  it("ignora linhas sem data ao montar a timeline mas mantém no total", () => {
    const rows: RawReportInput[] = [
      { source: "urbano", createdAt: null, category: "A", region: "X" },
      { source: "urbano", createdAt: "2026-05-01T10:00:00Z", category: "A", region: "X" },
    ];
    const stats = aggregate(rows, {});
    expect(stats.total).toBe(2);
    expect(stats.timeline).toHaveLength(1);
  });

  it("região 'Não informada' mapeia para zona 'Não informada'", () => {
    const rows: RawReportInput[] = [
      { source: "urbano", createdAt: "2026-05-01T10:00:00Z", category: "A", region: "Não informada" },
    ];
    const stats = aggregate(rows, {});
    expect(stats.byRegion[0].zone).toBe("Não informada");
    expect(stats.byZone[0].zone).toBe("Não informada");
  });

  it("ordena byCategory e byRegion por contagem decrescente", () => {
    const rows: RawReportInput[] = [
      { source: "urbano", createdAt: "2026-05-01T10:00:00Z", category: "A", region: "X" },
      { source: "urbano", createdAt: "2026-05-01T10:00:00Z", category: "B", region: "Y" },
      { source: "urbano", createdAt: "2026-05-01T10:00:00Z", category: "B", region: "Y" },
      { source: "urbano", createdAt: "2026-05-01T10:00:00Z", category: "B", region: "Y" },
    ];
    const stats = aggregate(rows, {});
    expect(stats.byCategory[0]).toMatchObject({ category: "B", count: 3 });
    expect(stats.byCategory[1]).toMatchObject({ category: "A", count: 1 });
    expect(stats.byRegion[0]).toMatchObject({ region: "Y", count: 3 });
  });
});

interface MockChain {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
}

function createQueryChain(result: { data: unknown; error: unknown }): MockChain {
  const chain = {} as MockChain;
  chain.select = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockResolvedValue(result);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  return chain;
}

type SupabaseFrom = typeof supabase.from;

describe("useReportsVolume (hook)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("agrega dados das três tabelas no estado retornado", async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === "urban_reports") {
        return createQueryChain({
          data: [
            { created_at: "2026-05-01T10:00:00Z", category: "Iluminação", neighborhood: "Tatuapé" },
            { created_at: "2026-05-01T11:00:00Z", category: "Buraco", neighborhood: "Sé" },
          ],
          error: null,
        });
      }
      if (table === "transport_reports") {
        return createQueryChain({
          data: [
            {
              created_at: "2026-05-02T08:00:00Z",
              report_type: "ônibus",
              sub_category: "Atraso",
              location: "Pinheiros",
              stop_location: null,
            },
          ],
          error: null,
        });
      }
      if (table === "service_ratings") {
        return createQueryChain({
          data: [
            {
              created_at: "2026-05-03T08:00:00Z",
              public_services: { service_type: "saude", district: "Tatuapé" },
            },
          ],
          error: null,
        });
      }
      return createQueryChain({ data: [], error: null });
    });

    vi.spyOn(supabase, "from").mockImplementation(fromMock as unknown as SupabaseFrom);

    const { result } = renderHook(() => useReportsVolume({}));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.stats.total).toBe(4);
    expect(result.current.stats.urbano).toBe(2);
    expect(result.current.stats.transporte).toBe(1);
    expect(result.current.stats.avaliacao).toBe(1);
    expect(result.current.stats.timeline).toHaveLength(3);
  });

  it("propaga erro de Supabase no estado de erro", async () => {
    const errorImpl = (_table: string) =>
      createQueryChain({ data: null, error: { message: "boom" } });
    vi.spyOn(supabase, "from").mockImplementation(errorImpl as unknown as SupabaseFrom);

    const { result } = renderHook(() => useReportsVolume({}));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toMatch(/Não foi possível carregar/i);
    expect(result.current.stats.total).toBe(0);
  });
});
