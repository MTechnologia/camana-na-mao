import { describe, expect, it } from "vitest";
import {
  isPointInSaoPauloBounds,
  parseHeatmapRpcPayload,
  SAO_PAULO_HEATMAP_BOUNDS,
} from "./reportsHeatmapData";

describe("isPointInSaoPauloBounds", () => {
  it("accepts centro de SP", () => {
    expect(isPointInSaoPauloBounds(-23.5505, -46.6333)).toBe(true);
  });

  it("rejects fora do bbox", () => {
    expect(isPointInSaoPauloBounds(-22.9, -46.6)).toBe(false);
    expect(isPointInSaoPauloBounds(-23.55, -47.2)).toBe(false);
  });
});

describe("parseHeatmapRpcPayload", () => {
  it("parseia pontos georreferenciados e filtra fora de SP", () => {
    const raw = {
      period: "30d",
      start_at: "2026-01-01T00:00:00.000Z",
      truncated: false,
      points: [
        { lat: -23.55, lng: -46.63, weight: 3 },
        { lat: -22.0, lng: -46.63, weight: 1 },
        { lat: "invalid", lng: -46.63, weight: 1 },
      ],
    };
    const p = parseHeatmapRpcPayload(raw);
    expect(p).not.toBeNull();
    expect(p!.points).toHaveLength(1);
    expect(p!.points[0].weight).toBe(3);
    expect(p!.truncated).toBe(false);
  });

  it("retorna null sem points", () => {
    expect(parseHeatmapRpcPayload({ period: "7d" })).toBeNull();
    expect(parseHeatmapRpcPayload(null)).toBeNull();
  });

  it("expõe constantes de bbox coerentes", () => {
    expect(SAO_PAULO_HEATMAP_BOUNDS.maxLat).toBeGreaterThan(SAO_PAULO_HEATMAP_BOUNDS.minLat);
    expect(SAO_PAULO_HEATMAP_BOUNDS.maxLng).toBeGreaterThan(SAO_PAULO_HEATMAP_BOUNDS.minLng);
  });
});
