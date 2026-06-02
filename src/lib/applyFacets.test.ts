import { describe, it, expect } from "vitest";
import { applyAudienciasFacet, applyCriticidadeFacet, applyEficienciaFacet } from "./applyFacets";

/**
 * HU-14 — Testes dos utils de aplicação de facets.
 *
 * Validam que cada filtro é aplicado isoladamente e que o facet de uma aba
 * não afeta dados de outra (testes de isolamento são feitos em e2e).
 */

describe("applyCriticidadeFacet", () => {
  const rows = [
    { id: 1, severity: "low", active_consequences: null },
    { id: 2, severity: "medium", active_consequences: "água parada" },
    { id: 3, severity: "high", active_consequences: null },
    { id: 4, severity: "critical", active_consequences: "risco eminente" },
    { id: 5, severity: "Crítica", active_consequences: null }, // PT label
  ];

  it("undefined facet retorna tudo", () => {
    expect(applyCriticidadeFacet(rows, undefined)).toHaveLength(5);
  });

  it("filtra por severidades", () => {
    const result = applyCriticidadeFacet(rows, { severities: ["high", "critical"] });
    expect(result.map((r) => r.id)).toEqual([3, 4, 5]);
  });

  it("criticalOnly mantém apenas críticos (case-insensitive)", () => {
    const result = applyCriticidadeFacet(rows, { criticalOnly: true });
    expect(result.map((r) => r.id)).toEqual([4, 5]);
  });

  it("hasActiveConsequences filtra por consequências não vazias", () => {
    const result = applyCriticidadeFacet(rows, { hasActiveConsequences: true });
    expect(result.map((r) => r.id)).toEqual([2, 4]);
  });

  it("combina múltiplos filtros", () => {
    const result = applyCriticidadeFacet(rows, {
      severities: ["high", "critical"],
      hasActiveConsequences: true,
    });
    expect(result.map((r) => r.id)).toEqual([4]);
  });
});

describe("applyEficienciaFacet", () => {
  const rows = [
    { id: 1, status: "pending", responseHours: null },
    { id: 2, status: "resolved", responseHours: 12 }, // dentro 24h SLA
    { id: 3, status: "resolved", responseHours: 48 },
    { id: 4, status: "in_progress", responseHours: null },
    { id: 5, status: "resolved", responseHours: 720 }, // 30 dias
  ];

  it("undefined facet retorna tudo", () => {
    expect(applyEficienciaFacet(rows, undefined)).toHaveLength(5);
  });

  it("filtra por status", () => {
    const result = applyEficienciaFacet(rows, { statuses: ["resolved"] });
    expect(result.map((r) => r.id)).toEqual([2, 3, 5]);
  });

  it("slaWindow 24h mantém apenas <= 24h e descarta sem responseHours", () => {
    const result = applyEficienciaFacet(rows, { slaWindow: "24h" });
    expect(result.map((r) => r.id)).toEqual([2]);
  });

  it("slaWindow 'all' não filtra por tempo", () => {
    const result = applyEficienciaFacet(rows, { slaWindow: "all" });
    expect(result).toHaveLength(5);
  });

  it("range de dias filtra fora", () => {
    // 1 dia = 24h. 2-7 dias = 48 a 168h.
    const result = applyEficienciaFacet(rows, {
      responseMinDays: 2,
      responseMaxDays: 7,
    });
    expect(result.map((r) => r.id)).toEqual([3]);
  });

  it("combina status + slaWindow", () => {
    const result = applyEficienciaFacet(rows, {
      statuses: ["resolved"],
      slaWindow: "7d",
    });
    expect(result.map((r) => r.id)).toEqual([2, 3]);
  });
});

describe("applyAudienciasFacet", () => {
  const rows = [
    { id: 1, comissao: "Saúde", status: "agendada" },
    { id: 2, comissao: "Educação", status: "realizada" },
    { id: 3, comissao: "Saúde", status: "cancelada" },
    { id: 4, comissao: null, status: "agendada" },
  ];

  it("undefined facet retorna tudo", () => {
    expect(applyAudienciasFacet(rows, undefined)).toHaveLength(4);
  });

  it("filtra por comissões (case-insensitive)", () => {
    const result = applyAudienciasFacet(rows, { comissoes: ["saúde"] });
    expect(result.map((r) => r.id)).toEqual([1, 3]);
  });

  it("filtra por status", () => {
    const result = applyAudienciasFacet(rows, { statuses: ["agendada"] });
    expect(result.map((r) => r.id)).toEqual([1, 4]);
  });

  it("combina comissões + status", () => {
    const result = applyAudienciasFacet(rows, {
      comissoes: ["Saúde"],
      statuses: ["agendada"],
    });
    expect(result.map((r) => r.id)).toEqual([1]);
  });

  it("comissão null nunca passa quando há filtro de comissão", () => {
    const result = applyAudienciasFacet(rows, { comissoes: ["Saúde"] });
    expect(result.find((r) => r.id === 4)).toBeUndefined();
  });
});
