import { describe, it, expect } from "vitest";
import {
  countActiveBaseFilters,
  countActiveCriticidadeFacet,
  countActiveEficienciaFacet,
  countActiveAudienciasFacet,
  EMPTY_BASE_FILTERS,
  facetToParams,
  paramsToFacet,
  slaWindowToHours,
} from "./analyticsFilters";

/**
 * HU-14 — Testes do catálogo de filtros analíticos.
 */

describe("countActiveBaseFilters", () => {
  it("retorna 0 para filtros vazios", () => {
    expect(countActiveBaseFilters(EMPTY_BASE_FILTERS)).toBe(0);
  });

  it("conta período + categorias + regiões + zonas", () => {
    expect(
      countActiveBaseFilters({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        categories: ["iluminacao", "buracos"],
        regions: ["Mooca"],
        zones: ["Leste"],
      }),
    ).toBe(4); // período conta como 1 + 2 categorias + 1 região + 1 zona = 5? não, período = 1
  });

  it("conta apenas o que está preenchido", () => {
    expect(
      countActiveBaseFilters({
        startDate: null,
        endDate: null,
        categories: [],
        regions: ["Mooca"],
        zones: [],
      }),
    ).toBe(1);
  });
});

describe("countActiveCriticidadeFacet", () => {
  it("retorna 0 para undefined", () => {
    expect(countActiveCriticidadeFacet(undefined)).toBe(0);
  });
  it("retorna 0 para objeto vazio", () => {
    expect(countActiveCriticidadeFacet({})).toBe(0);
  });
  it("conta severities + criticalOnly + hasActiveConsequences", () => {
    expect(
      countActiveCriticidadeFacet({
        severities: ["high", "critical"],
        criticalOnly: true,
        hasActiveConsequences: true,
      }),
    ).toBe(3);
  });
  it("severities vazio não conta", () => {
    expect(countActiveCriticidadeFacet({ severities: [] })).toBe(0);
  });
});

describe("countActiveEficienciaFacet", () => {
  it("retorna 0 para 'all' slaWindow", () => {
    expect(countActiveEficienciaFacet({ slaWindow: "all" })).toBe(0);
  });
  it("conta slaWindow específico + statuses + range", () => {
    expect(
      countActiveEficienciaFacet({
        slaWindow: "24h",
        statuses: ["pending"],
        responseMinDays: 3,
      }),
    ).toBe(3);
  });
});

describe("countActiveAudienciasFacet", () => {
  it("conta comissões + statuses", () => {
    expect(
      countActiveAudienciasFacet({
        comissoes: ["saude", "educacao"],
        statuses: ["agendada"],
      }),
    ).toBe(2);
  });
});

describe("slaWindowToHours", () => {
  it("converte janelas em horas", () => {
    expect(slaWindowToHours("24h")).toBe(24);
    expect(slaWindowToHours("48h")).toBe(48);
    expect(slaWindowToHours("7d")).toBe(168);
    expect(slaWindowToHours("30d")).toBe(720);
  });
  it("'all' retorna null (sem limite)", () => {
    expect(slaWindowToHours("all")).toBeNull();
  });
});

describe("facetToParams / paramsToFacet", () => {
  it("round-trip de array", () => {
    const facet = { severities: ["high", "critical"] };
    const params = facetToParams("crit", facet);
    expect(params.get("f.crit.severities")).toBe("high,critical");
    const parsed = paramsToFacet("crit", params);
    expect(parsed.severities).toEqual(["high", "critical"]);
  });

  it("round-trip de boolean", () => {
    const facet = { criticalOnly: true };
    const params = facetToParams("crit", facet);
    expect(params.get("f.crit.criticalOnly")).toBe("1");
    const parsed = paramsToFacet("crit", params);
    expect(parsed.criticalOnly).toBe(true);
  });

  it("omite booleans false", () => {
    const facet = { criticalOnly: false };
    const params = facetToParams("crit", facet);
    expect(params.get("f.crit.criticalOnly")).toBeNull();
  });

  it("omite arrays vazios", () => {
    const facet = { severities: [] };
    const params = facetToParams("crit", facet);
    expect(params.get("f.crit.severities")).toBeNull();
  });

  it("round-trip de número", () => {
    const facet = { responseMinDays: 3 };
    const params = facetToParams("efi", facet);
    expect(params.get("f.efi.responseMinDays")).toBe("3");
    const parsed = paramsToFacet("efi", params);
    expect(parsed.responseMinDays).toBe(3);
  });

  it("não mistura facets de keys diferentes", () => {
    const params = new URLSearchParams("f.crit.severities=high&f.efi.slaWindow=24h");
    const crit = paramsToFacet("crit", params);
    const efi = paramsToFacet("efi", params);
    expect(crit).toEqual({ severities: ["high"] });
    expect(efi).toEqual({ slaWindow: "24h" });
  });

  it("ignora params que não tem o prefixo correto", () => {
    const params = new URLSearchParams("foo=bar&period=last_30d&f.crit.severities=high");
    const crit = paramsToFacet("crit", params);
    expect(crit).toEqual({ severities: ["high"] });
  });
});
