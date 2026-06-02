import { describe, expect, it } from "vitest";
import { filterUnifiedReportsByRegion } from "@/lib/crossAnalyticsFilters";
import type { UnifiedReport } from "@/lib/analyticsDimensions";

function rep(overrides: Partial<UnifiedReport> = {}): UnifiedReport {
  return {
    id: "1",
    category: "Urbano",
    status: "pending",
    severity: "medium",
    neighborhood: "Pinheiros",
    latitude: -23.56,
    longitude: -46.69,
    createdAt: "2026-01-01",
    sentimentRaw: null,
    source: "manual",
    userId: "u1",
    demoGender: null,
    demoRace: null,
    demoSocialClass: null,
    demoAge: null,
    ...overrides,
  };
}

describe("filterUnifiedReportsByRegion", () => {
  it("mantém todos quando região é all", () => {
    const rows = [rep(), rep({ id: "2", neighborhood: "Santana" })];
    expect(filterUnifiedReportsByRegion(rows, "all")).toHaveLength(2);
  });

  it("filtra pela zona do dashboard (west = Zona Oeste)", () => {
    const rows = [
      rep({ id: "w", neighborhood: "Pinheiros" }),
      rep({ id: "e", neighborhood: "Sé", latitude: -23.55, longitude: -46.63 }),
    ];
    const filtered = filterUnifiedReportsByRegion(rows, "west");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("w");
  });
});
