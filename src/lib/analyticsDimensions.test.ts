import { describe, it, expect } from "vitest";
import { DIMENSIONS, DIMENSION_KEYS, __test__, type UnifiedReport } from "./analyticsDimensions";

const { normalizeStatus, normalizeSeverity, normalizeSentiment, ageToGroup, NOT_INFORMED } = __test__;

function rep(overrides: Partial<UnifiedReport> = {}): UnifiedReport {
  return {
    id: "r1",
    category: "Urbano",
    status: "pending",
    severity: "medium",
    neighborhood: "Tatuapé",
    latitude: -23.54,
    longitude: -46.57,
    createdAt: "2026-04-15T13:30:00Z",
    sentimentRaw: null,
    source: "manual",
    userId: "u1",
    demoGender: "feminino",
    demoRace: "parda",
    demoSocialClass: "C",
    demoAge: 32,
    ...overrides,
  };
}

describe("normalizers", () => {
  it("normalizeStatus mapeia variantes para canônico pt-BR", () => {
    expect(normalizeStatus("resolved")).toBe("Resolvido");
    expect(normalizeStatus("RESOLVIDO")).toBe("Resolvido");
    expect(normalizeStatus("in_progress")).toBe("Em andamento");
    expect(normalizeStatus("rejected")).toBe("Rejeitado");
    expect(normalizeStatus("pending")).toBe("Pendente");
    expect(normalizeStatus(null)).toBe("Pendente");
  });

  it("normalizeSeverity cobre crit/alto/medio/baixo", () => {
    expect(normalizeSeverity("crítico")).toBe("Crítico");
    expect(normalizeSeverity("crit")).toBe("Crítico");
    expect(normalizeSeverity("alta")).toBe("Alto");
    expect(normalizeSeverity("medium")).toBe("Médio");
    expect(normalizeSeverity("low")).toBe("Baixo");
    expect(normalizeSeverity(null)).toBe("Sem classificação");
  });

  it("normalizeSentiment mapeia ai_sentiment", () => {
    expect(normalizeSentiment("positive")).toBe("Positivo");
    expect(normalizeSentiment("positivo")).toBe("Positivo");
    expect(normalizeSentiment("negativo")).toBe("Negativo");
    expect(normalizeSentiment("neutral")).toBe("Neutro");
    expect(normalizeSentiment(null)).toBe("Neutro");
  });

  it("ageToGroup atribui faixas corretamente", () => {
    expect(ageToGroup(15)).toBe("under_18");
    expect(ageToGroup(20)).toBe("18_24");
    expect(ageToGroup(30)).toBe("25_34");
    expect(ageToGroup(40)).toBe("35_44");
    expect(ageToGroup(50)).toBe("45_54");
    expect(ageToGroup(60)).toBe("55_64");
    expect(ageToGroup(75)).toBe("65_plus");
    expect(ageToGroup(null)).toBe(NOT_INFORMED);
  });
});

describe("DIMENSIONS — extratores", () => {
  it("category extrai diretamente", () => {
    expect(DIMENSIONS.category.extract(rep({ category: "Transporte" }))).toBe("Transporte");
  });

  it("status normaliza", () => {
    expect(DIMENSIONS.status.extract(rep({ status: "resolved" }))).toBe("Resolvido");
  });

  it("severity normaliza", () => {
    expect(DIMENSIONS.severity.extract(rep({ severity: "alta" }))).toBe("Alto");
  });

  it("zone usa bairroParaZona", () => {
    const z = DIMENSIONS.zone.extract(rep({ neighborhood: "Tatuapé", latitude: -23.54, longitude: -46.57 }));
    // qualquer string válida (depende do mapeamento real); só não pode ser vazia
    expect(typeof z).toBe("string");
    expect(z.length).toBeGreaterThan(0);
  });

  it("time_month extrai 1-12 da createdAt", () => {
    expect(DIMENSIONS.time_month.extract(rep({ createdAt: "2026-04-15T13:00:00Z" }))).toBe("4");
    expect(DIMENSIONS.time_month.extract(rep({ createdAt: null }))).toBe(NOT_INFORMED);
    expect(DIMENSIONS.time_month.extract(rep({ createdAt: "invalid" }))).toBe(NOT_INFORMED);
  });

  it("time_weekday retorna nome do dia", () => {
    // 2026-04-15 é uma quarta-feira
    expect(DIMENSIONS.time_weekday.extract(rep({ createdAt: "2026-04-15T13:00:00Z" }))).toBe("Quarta");
  });

  it("time_hour retorna hora local 0-23", () => {
    const v = DIMENSIONS.time_hour.extract(rep({ createdAt: "2026-04-15T13:00:00Z" }));
    expect(/^\d+$/.test(v)).toBe(true);
    expect(parseInt(v, 10)).toBeGreaterThanOrEqual(0);
    expect(parseInt(v, 10)).toBeLessThanOrEqual(23);
  });

  it("sentiment extrai do sentimentRaw normalizado", () => {
    expect(DIMENSIONS.sentiment.extract(rep({ sentimentRaw: "positive" }))).toBe("Positivo");
  });

  it("gender extrai demografia ou not_informed", () => {
    expect(DIMENSIONS.gender.extract(rep({ demoGender: "feminino" }))).toBe("feminino");
    expect(DIMENSIONS.gender.extract(rep({ demoGender: null }))).toBe(NOT_INFORMED);
  });

  it("race extrai demografia ou not_informed", () => {
    expect(DIMENSIONS.race.extract(rep({ demoRace: "parda" }))).toBe("parda");
    expect(DIMENSIONS.race.extract(rep({ demoRace: null }))).toBe(NOT_INFORMED);
  });

  it("social_class extrai demografia ou not_informed", () => {
    expect(DIMENSIONS.social_class.extract(rep({ demoSocialClass: "C" }))).toBe("C");
    expect(DIMENSIONS.social_class.extract(rep({ demoSocialClass: null }))).toBe(NOT_INFORMED);
  });

  it("age_group calcula grupo a partir de demoAge", () => {
    expect(DIMENSIONS.age_group.extract(rep({ demoAge: 32 }))).toBe("25_34");
    expect(DIMENSIONS.age_group.extract(rep({ demoAge: null }))).toBe(NOT_INFORMED);
  });

  it("source extrai diretamente", () => {
    expect(DIMENSIONS.source.extract(rep({ source: "ai" }))).toBe("ai");
  });
});

describe("DIMENSIONS — labels", () => {
  it("genero traduz códigos", () => {
    expect(DIMENSIONS.gender.valueLabel("feminino")).toBe("Feminino");
    expect(DIMENSIONS.gender.valueLabel("masculino")).toBe("Masculino");
    expect(DIMENSIONS.gender.valueLabel(NOT_INFORMED)).toBe("Não informado");
  });

  it("classe traduz com prefixo", () => {
    expect(DIMENSIONS.social_class.valueLabel("A")).toBe("Classe A");
  });

  it("idade exibe ranges legíveis", () => {
    expect(DIMENSIONS.age_group.valueLabel("18_24")).toBe("18-24");
    expect(DIMENSIONS.age_group.valueLabel("65_plus")).toBe("65 ou mais");
  });

  it("hora exibe sufixo h", () => {
    expect(DIMENSIONS.time_hour.valueLabel("9")).toBe("9h");
  });

  it("mes traduz para nome em pt-BR", () => {
    expect(DIMENSIONS.time_month.valueLabel("4")).toBe("Abril");
    expect(DIMENSIONS.time_month.valueLabel("12")).toBe("Dezembro");
  });
});

describe("DIMENSION_KEYS lista", () => {
  it("tem 13 dimensões", () => {
    expect(DIMENSION_KEYS).toHaveLength(13);
  });

  it("todas as keys têm definição completa", () => {
    DIMENSION_KEYS.forEach((k) => {
      const d = DIMENSIONS[k];
      expect(d).toBeDefined();
      expect(d.label.length).toBeGreaterThan(0);
      expect(typeof d.extract).toBe("function");
      expect(Array.isArray(d.values)).toBe(true);
    });
  });
});
