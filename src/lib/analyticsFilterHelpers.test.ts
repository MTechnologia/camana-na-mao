import { describe, it, expect } from "vitest";
import { applyAnalyticsFilters, recordMatchesFilters, __test__ } from "./analyticsFilterHelpers";

const { normalize } = __test__;

describe("normalize", () => {
  it("remove acentos e baixa caixa", () => {
    expect(normalize("Tatuapé")).toBe("tatuape");
    expect(normalize("São Paulo")).toBe("sao paulo");
    expect(normalize("AVALIAÇÃO")).toBe("avaliacao");
  });

  it("trim de espaços", () => {
    expect(normalize("  Iluminação  ")).toBe("iluminacao");
  });
});

interface R {
  category?: string;
  region?: string;
  zone?: import("@/lib/regionMapping").ZonaVolumeOuDesconhecida;
}

describe("recordMatchesFilters", () => {
  const rec: R = { category: "Iluminação", region: "Tatuapé", zone: "Zona Leste" };

  it("passa quando filtros vazios", () => {
    expect(recordMatchesFilters(rec, {})).toBe(true);
    expect(recordMatchesFilters(rec, { categories: [] })).toBe(true);
    expect(recordMatchesFilters(rec, { regions: [], zones: [] })).toBe(true);
  });

  it("filtra por categoria exata (ignorando case/acentos)", () => {
    expect(recordMatchesFilters(rec, { categories: ["iluminacao"] })).toBe(true);
    expect(recordMatchesFilters(rec, { categories: ["ILUMINAÇÃO"] })).toBe(true);
    expect(recordMatchesFilters(rec, { categories: ["Buracos"] })).toBe(false);
  });

  it("aceita multi-seleção de categoria", () => {
    expect(recordMatchesFilters(rec, { categories: ["Buracos", "Iluminação"] })).toBe(true);
    expect(recordMatchesFilters(rec, { categories: ["Buracos", "Calçada"] })).toBe(false);
  });

  it("filtra por região (match parcial)", () => {
    expect(recordMatchesFilters(rec, { regions: ["Tatuape"] })).toBe(true);
    expect(recordMatchesFilters(rec, { regions: ["tatu"] })).toBe(true);
    expect(recordMatchesFilters(rec, { regions: ["Pinheiros"] })).toBe(false);
  });

  it("filtra por zona", () => {
    expect(recordMatchesFilters(rec, { zones: ["Zona Leste"] })).toBe(true);
    expect(recordMatchesFilters(rec, { zones: ["Zona Norte"] })).toBe(false);
  });

  it("combina múltiplos filtros (AND)", () => {
    expect(
      recordMatchesFilters(rec, {
        categories: ["Iluminação"],
        zones: ["Zona Leste"],
      }),
    ).toBe(true);
    expect(
      recordMatchesFilters(rec, {
        categories: ["Iluminação"],
        zones: ["Zona Norte"],
      }),
    ).toBe(false);
  });

  it("retorna false quando record não tem category mas filtro exige", () => {
    expect(recordMatchesFilters({}, { categories: ["X"] })).toBe(false);
  });

  it("retorna false quando record não tem region mas filtro exige", () => {
    expect(recordMatchesFilters({}, { regions: ["X"] })).toBe(false);
  });
});

describe("applyAnalyticsFilters", () => {
  const records: R[] = [
    { category: "Iluminação", region: "Tatuapé", zone: "Zona Leste" },
    { category: "Iluminação", region: "Mooca", zone: "Zona Leste" },
    { category: "Buracos", region: "Pinheiros", zone: "Zona Oeste" },
    { category: "Buracos", region: "Sé", zone: "Centro" },
  ];

  it("retorna a lista intacta quando todos filtros estão vazios", () => {
    expect(applyAnalyticsFilters(records, {})).toBe(records);
    expect(applyAnalyticsFilters(records, { categories: [] })).toBe(records);
  });

  it("filtra por categoria", () => {
    const out = applyAnalyticsFilters(records, { categories: ["Iluminação"] });
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.category === "Iluminação")).toBe(true);
  });

  it("filtra por zona", () => {
    const out = applyAnalyticsFilters(records, { zones: ["Zona Leste"] });
    expect(out).toHaveLength(2);
  });

  it("filtra por combinação (AND entre filtros)", () => {
    const out = applyAnalyticsFilters(records, {
      categories: ["Buracos"],
      zones: ["Centro"],
    });
    expect(out).toHaveLength(1);
    expect(out[0].region).toBe("Sé");
  });

  it("retorna lista vazia quando nenhum record passa", () => {
    const out = applyAnalyticsFilters(records, { categories: ["Inexistente"] });
    expect(out).toEqual([]);
  });
});
