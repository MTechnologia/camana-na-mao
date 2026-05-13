import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn() },
}));

import { __test__ } from "./useDemographicCrossAnalytics";

const { labelFor, REPORT_TYPES } = __test__;

describe("labelFor — tradução pt-BR", () => {
  it("traduz valores de gênero", () => {
    expect(labelFor("gender", "masculino")).toBe("Masculino");
    expect(labelFor("gender", "feminino")).toBe("Feminino");
    expect(labelFor("gender", "nao_binario")).toBe("Não-binário");
    expect(labelFor("gender", "not_informed")).toBe("Não informado");
  });

  it("traduz valores de raça", () => {
    expect(labelFor("race", "branca")).toBe("Branca");
    expect(labelFor("race", "preta")).toBe("Preta");
    expect(labelFor("race", "parda")).toBe("Parda");
    expect(labelFor("race", "indigena")).toBe("Indígena");
  });

  it("traduz classe social", () => {
    expect(labelFor("social_class", "A")).toBe("Classe A");
    expect(labelFor("social_class", "C")).toBe("Classe C");
    expect(labelFor("social_class", "not_informed")).toBe("Não informado");
  });

  it("traduz faixa etária", () => {
    expect(labelFor("age_group", "18_24")).toBe("18-24");
    expect(labelFor("age_group", "25_34")).toBe("25-34");
    expect(labelFor("age_group", "65_plus")).toBe("65 ou mais");
    expect(labelFor("age_group", "under_18")).toBe("Menos de 18");
  });

  it("retorna o valor cru quando não há label conhecido", () => {
    expect(labelFor("gender", "valor_desconhecido")).toBe("valor_desconhecido");
  });
});

describe("REPORT_TYPES", () => {
  it("define os 3 tipos macro corretamente", () => {
    expect(REPORT_TYPES).toHaveLength(3);
    expect(REPORT_TYPES.map((r) => r.category)).toEqual([
      "Urbano",
      "Transporte",
      "Avaliação",
    ]);
    expect(REPORT_TYPES.map((r) => r.rpcType)).toEqual(["urban", "transport", "evaluation"]);
  });
});

describe("integração — esqueleto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("os exports principais estão disponíveis", () => {
    expect(typeof labelFor).toBe("function");
    expect(Array.isArray(REPORT_TYPES)).toBe(true);
  });
});
