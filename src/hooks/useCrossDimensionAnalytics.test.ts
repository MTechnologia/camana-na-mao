import { describe, it, expect, vi } from "vitest";

import { createSupabaseModuleMock } from "@/test/mocks/supabase";

vi.mock("@/integrations/supabase/client", () => createSupabaseModuleMock());

import { __test__ } from "./useCrossDimensionAnalytics";
import type { UnifiedReport } from "@/lib/analyticsDimensions";

const { buildMatrix, attachDemographics } = __test__;

function rep(overrides: Partial<UnifiedReport> = {}): UnifiedReport {
  return {
    id: "r" + Math.random().toString(36).slice(2, 6),
    category: "Urbano",
    status: "pending",
    severity: "medium",
    neighborhood: "Tatuapé",
    latitude: -23.54,
    longitude: -46.57,
    createdAt: "2026-04-15T13:00:00Z",
    sentimentRaw: null,
    source: "manual",
    userId: "u1",
    demoGender: "feminino",
    demoRace: "parda",
    demoSocialClass: "C",
    demoAge: 30,
    ...overrides,
  };
}

describe("buildMatrix", () => {
  it("constrói matriz vazia para lista vazia", () => {
    const m = buildMatrix([], "category", "gender");
    expect(m.total).toBe(0);
    expect(m.maxCount).toBe(0);
    expect(m.rowValues).toHaveLength(0);
    expect(m.colValues).toHaveLength(0);
  });

  it("agrega categoria × gênero corretamente", () => {
    const reports = [
      rep({ id: "1", category: "Urbano", demoGender: "feminino" }),
      rep({ id: "2", category: "Urbano", demoGender: "feminino" }),
      rep({ id: "3", category: "Urbano", demoGender: "masculino" }),
      rep({ id: "4", category: "Transporte", demoGender: "feminino" }),
    ];
    const m = buildMatrix(reports, "category", "gender");
    expect(m.total).toBe(4);
    expect(m.cells["Urbano|feminino"]).toBe(2);
    expect(m.cells["Urbano|masculino"]).toBe(1);
    expect(m.cells["Transporte|feminino"]).toBe(1);
    expect(m.maxCount).toBe(2);
  });

  it("ordena rowValues e colValues por total desc", () => {
    const reports = [
      rep({ id: "1", category: "Urbano" }),
      rep({ id: "2", category: "Urbano" }),
      rep({ id: "3", category: "Urbano" }),
      rep({ id: "4", category: "Transporte" }),
      rep({ id: "5", category: "Avaliação" }),
    ];
    const m = buildMatrix(reports, "category", "gender");
    expect(m.rowValues[0].value).toBe("Urbano");
    expect(m.rowValues[0].total).toBe(3);
  });

  it("status × severity gera matriz coerente", () => {
    const reports = [
      rep({ id: "1", status: "resolved", severity: "alta" }),
      rep({ id: "2", status: "resolved", severity: "medium" }),
      rep({ id: "3", status: "pending", severity: "alta" }),
    ];
    const m = buildMatrix(reports, "status", "severity");
    expect(m.cells["Resolvido|Alto"]).toBe(1);
    expect(m.cells["Resolvido|Médio"]).toBe(1);
    expect(m.cells["Pendente|Alto"]).toBe(1);
  });

  it("time_month × time_weekday cruza datas", () => {
    const reports = [
      rep({ id: "1", createdAt: "2026-04-15T13:00:00Z" }), // quarta abril
      rep({ id: "2", createdAt: "2026-04-22T13:00:00Z" }), // quarta abril
      rep({ id: "3", createdAt: "2026-05-06T13:00:00Z" }), // quarta maio
    ];
    const m = buildMatrix(reports, "time_month", "time_weekday");
    expect(m.cells["4|Quarta"]).toBe(2);
    expect(m.cells["5|Quarta"]).toBe(1);
  });

  it("relatos sem demografia caem em not_informed", () => {
    const reports = [
      rep({ id: "1", demoGender: null, demoRace: null }),
    ];
    const m = buildMatrix(reports, "gender", "race");
    expect(m.cells["not_informed|not_informed"]).toBe(1);
  });
});

describe("attachDemographics", () => {
  it("anexa demografia do mapa por user_id", () => {
    const partial = [
      { id: "1", category: "Urbano" as const, userId: "u1", status: null, severity: null, neighborhood: null, latitude: null, longitude: null, createdAt: null, sentimentRaw: null, source: "manual" as const },
    ];
    const map = new Map([
      ["u1", { gender: "feminino", race: "parda", social_class: "C", age: 28 }],
    ]);
    const result = attachDemographics(partial, map);
    expect(result[0].demoGender).toBe("feminino");
    expect(result[0].demoRace).toBe("parda");
    expect(result[0].demoSocialClass).toBe("C");
    expect(result[0].demoAge).toBe(28);
  });

  it("relatos sem user_id ficam com demografia null", () => {
    const partial = [
      { id: "1", category: "Urbano" as const, userId: null, status: null, severity: null, neighborhood: null, latitude: null, longitude: null, createdAt: null, sentimentRaw: null, source: "manual" as const },
    ];
    const result = attachDemographics(partial, new Map());
    expect(result[0].demoGender).toBeNull();
    expect(result[0].demoAge).toBeNull();
  });
});
