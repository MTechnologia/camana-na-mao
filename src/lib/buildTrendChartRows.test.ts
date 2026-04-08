import { describe, expect, it } from "vitest";
import { buildTrendChartRows, formatTrendBucketLabel } from "./buildTrendChartRows";

describe("formatTrendBucketLabel", () => {
  it("formats day bucket for pt-BR style output", () => {
    const s = formatTrendBucketLabel("2026-06-15T12:00:00.000Z", "day");
    expect(s).toMatch(/\d{1,2}\/\d{1,2}/);
  });

  it("falls back to raw string on invalid input", () => {
    expect(formatTrendBucketLabel("not-a-date", "day")).toBe("not-a-date");
  });
});

describe("buildTrendChartRows", () => {
  it("pivots multiple categories and buckets", () => {
    const points = [
      { bucket: "2026-01-01T00:00:00.000Z", category: "a", count: 2 },
      { bucket: "2026-01-01T00:00:00.000Z", category: "b", count: 1 },
      { bucket: "2026-01-02T00:00:00.000Z", category: "a", count: 3 },
    ];
    const { rows, categoryKeys } = buildTrendChartRows(points, "day", 10);
    expect(categoryKeys).toContain("a");
    expect(categoryKeys).toContain("b");
    expect(rows).toHaveLength(2);
    const r0 = rows[0];
    expect(r0.a).toBe(2);
    expect(r0.b).toBe(1);
    const r1 = rows[1];
    expect(r1.a).toBe(3);
    expect(r1.b).toBe(0);
  });

  it("collapses overflow categories into Outros", () => {
    const points = [
      { bucket: "2026-01-01T00:00:00.000Z", category: "c1", count: 1 },
      { bucket: "2026-01-01T00:00:00.000Z", category: "c2", count: 2 },
      { bucket: "2026-01-01T00:00:00.000Z", category: "c3", count: 3 },
    ];
    const { categoryKeys } = buildTrendChartRows(points, "day", 2);
    expect(categoryKeys).toContain("Outros");
    expect(categoryKeys.length).toBeLessThanOrEqual(3);
  });

  it("returns empty for no points", () => {
    expect(buildTrendChartRows([], "day")).toEqual({ rows: [], categoryKeys: [] });
  });
});
