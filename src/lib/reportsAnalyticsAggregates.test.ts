import { describe, expect, it } from "vitest";
import type { ReportsAnalyticsStats } from "@/hooks/useReportsAnalytics";
import {
  buildCategoryDistributionFromTerritoryRows,
  buildMetricTrendsFromStats,
  buildNeighborhoodBreakdownFromGeoRows,
  buildStreetBreakdownFromGeoRows,
  buildTerritoryPatternSummaries,
  countRecurringThemesFromCategories,
  patternRankFromAlerts,
  patternsFromCategories,
} from "@/lib/reportsAnalyticsAggregates";
import type { TerritoryGeoRow } from "@/lib/reportsAnalyticsAggregates";

function mockStats(overrides: Partial<ReportsAnalyticsStats> = {}): ReportsAnalyticsStats {
  return {
    total: 10,
    urban: 8,
    transport: 2,
    evaluation: 0,
    pending: 3,
    resolved: 5,
    critical: 1,
    trend: 0,
    resolvedTrend: 0,
    criticalTrend: 0,
    pendingTrend: 0,
    timeline: [
      { date: "2026-05-01", urban: 2, transport: 0, evaluation: 0, total: 2, resolved: 1 },
      { date: "2026-05-02", urban: 3, transport: 1, evaluation: 0, total: 4, resolved: 2 },
    ],
    byStatus: [{ status: "Pendente", count: 3, color: "" }],
    categories: [],
    volumeByZone: [],
    demographics: {
      byGender: [],
      byRace: [],
      bySocialClass: [],
      byAgeGroup: [],
      byRegion: [{ region: "Sé", count: 5, sentiment: 60 }],
    },
    engagement: {
      totalLikes: 0,
      totalComments: 0,
      avgLikesPerReport: 0,
      avgCommentsPerReport: 0,
      likesTrend: 0,
      commentsTrend: 0,
      topReports: [],
      conversionFunnel: [],
    },
    criticality: {
      criticalScore: 0,
      bySeverity: [],
      patterns: [{ id: "p1", type: "frequency", severity: "info", title: "A", description: "d" }],
      criticalPendingReports: [],
    },
    territoryPatterns: [],
    neighborhoodBreakdown: [],
    streetBreakdown: [],
    responseTime: { avgHours: 0, resolvedCount: 0, byZone: [], byNeighborhood: [], byCategory: [] },
    ...overrides,
  };
}

describe("buildMetricTrendsFromStats", () => {
  it("gera um ponto por dia na timeline com os quatro indicadores", () => {
    const series = buildMetricTrendsFromStats(mockStats());
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({
      volume: 2,
      sentiment: 60,
      patterns: 1,
    });
    expect(series[0].response).toBeTypeOf("number");
  });

  it("fallback com um ponto quando não há timeline mas há total", () => {
    const series = buildMetricTrendsFromStats(
      mockStats({ timeline: [], total: 7, urban: 7, transport: 0 }),
    );
    expect(series).toHaveLength(1);
    expect(series[0].volume).toBe(7);
  });
});

describe("patterns analytics helpers", () => {
  it("patternsFromCategories usa rótulos legíveis", () => {
    const alerts = patternsFromCategories([
      { category: "via_publica", count: 5 },
      { category: "atraso", count: 3 },
    ]);
    expect(alerts[0].title).toBe("Via pública");
    expect(alerts[1].title).toBe("Atraso");
  });

  it("patternRankFromAlerts agrega rótulos duplicados", () => {
    const rows = patternRankFromAlerts([
      {
        id: "1",
        type: "frequency",
        severity: "info",
        title: "atraso",
        description: "a",
        suggestedAction: "",
        count: 4,
      },
      {
        id: "2",
        type: "frequency",
        severity: "info",
        title: "atraso",
        description: "b",
        suggestedAction: "",
        count: 6,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe("Atraso");
    expect(rows[0].count).toBe(10);
  });

  it("countRecurringThemesFromCategories exige repetição mínima", () => {
    expect(
      countRecurringThemesFromCategories([
        { category: "a", count: 5 },
        { category: "b", count: 1 },
        { category: "c", count: 2 },
      ]),
    ).toBe(2);
  });

  it("buildCategoryDistributionFromTerritoryRows reflete apenas o recorte", () => {
    const dist = buildCategoryDistributionFromTerritoryRows([
      { neighborhood: "Sé", source: "urbano", category: "lixo" },
      { neighborhood: "Sé", source: "urbano", category: "lixo" },
      { neighborhood: "Sé", source: "transporte", category: "atraso" },
    ]);
    expect(dist).toHaveLength(2);
    expect(dist[0]).toEqual({ category: "lixo", count: 2 });
  });

  it("buildTerritoryPatternSummaries agrupa por bairro e tema", () => {
    const rows: TerritoryGeoRow[] = [
      { neighborhood: "Sé", source: "urbano", category: "via_publica" },
      { neighborhood: "Sé", source: "urbano", category: "via_publica" },
      { neighborhood: "Sé", source: "urbano", category: "lixo" },
      { neighborhood: "Pinheiros", source: "urbano", category: "lixo" },
    ];
    const summaries = buildTerritoryPatternSummaries(rows);
    const se = summaries.find((s) => s.regionLabel === "Sé");
    expect(se?.primaryPattern).toBe("Via pública");
    expect(se?.count).toBe(2);
    expect(summaries.find((s) => s.regionLabel === "Pinheiros")?.primaryPattern).toBe(
      "Lixo e limpeza",
    );
  });
});

describe("sentimento real por bairro/logradouro", () => {
  const territoryRows: TerritoryGeoRow[] = [
    {
      neighborhood: "Jardim Everest",
      source: "urbano",
      ai_sentiment: "positive",
      street: "Av. A",
      street_number: "1",
    },
    {
      neighborhood: "Jardim Everest",
      source: "urbano",
      ai_sentiment: "neutral",
      street: "Av. A",
      street_number: "1",
    },
    {
      neighborhood: "Jardim Everest",
      source: "urbano",
      ai_sentiment: null,
      street: "Av. B",
    },
  ];

  it("buildNeighborhoodBreakdownFromGeoRows agrega o sentimento médio por bairro", () => {
    const rows = buildNeighborhoodBreakdownFromGeoRows(territoryRows, territoryRows);
    const everest = rows.find((r) => r.neighborhood === "Jardim Everest");
    expect(everest?.count).toBe(3);
    // (100 + 50 + 50) / 3 = 67 — relato sem classificação entra como neutro (50).
    expect(everest?.sentiment).toBe(67);
  });

  it("buildNeighborhoodBreakdownFromGeoRows mantém sentiment null sem relato com sentimento", () => {
    const rows = buildNeighborhoodBreakdownFromGeoRows(territoryRows, []);
    expect(rows.every((r) => r.sentiment === null)).toBe(true);
  });

  it("buildStreetBreakdownFromGeoRows agrega o sentimento por logradouro (não classificado = neutro)", () => {
    const rows = buildStreetBreakdownFromGeoRows(territoryRows);
    const avA = rows.find((r) => r.street === "Av. A, 1");
    const avB = rows.find((r) => r.street === "Av. B");
    expect(avA?.sentiment).toBe(75);
    // Logradouro só com relato sem classificação → neutro (50), não mais cinza.
    expect(avB?.sentiment).toBe(50);
  });
});
