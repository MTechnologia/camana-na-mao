import { describe, expect, it } from "vitest";
import {
  buildDataExportDefaultFilters,
  dataExportFiltersFromUrbanAnalytics,
  dataExportFiltersFromGlobal,
} from "@/lib/buildDataExportFilters";

describe("buildDataExportFilters", () => {
  it("mapeia região global para zona canônica", () => {
    const f = dataExportFiltersFromGlobal("last_30d", "north", "all");
    expect(f?.zones).toEqual(["Zona Norte"]);
  });

  it("inclui status e categorias na análise urbana", () => {
    const f = dataExportFiltersFromUrbanAnalytics("last_7d", "mobilidade", "pending");
    expect(f?.startDate).toBeDefined();
    expect(f?.endDate).toBeDefined();
    expect(f?.status).toBe("pending");
    expect(f?.categories?.length).toBeGreaterThan(0);
  });

  it("usa bairro literal quando informado em regions", () => {
    const f = buildDataExportDefaultFilters({ regions: ["Santana"] }, "urban_reports");
    expect(f?.regions).toEqual(["Santana"]);
  });
});
