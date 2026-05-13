import { describe, it, expect } from "vitest";
import { __test__ } from "./RatingsBubbleMap";

const { colorForAvgStars, radiusForCount } = __test__;

describe("colorForAvgStars", () => {
  it("estrelas baixas retornam tons de vermelho (hue 0-30)", () => {
    const c1 = colorForAvgStars(1);
    const c1_5 = colorForAvgStars(1.5);
    expect(c1).toMatch(/hsl\(0,/);
    expect(c1_5).toMatch(/hsl\((1[0-9]|[0-9]),/);
  });

  it("estrela 3 (média) retorna amarelo (hue ~60)", () => {
    expect(colorForAvgStars(3)).toMatch(/hsl\(60,/);
  });

  it("estrelas altas retornam verde (hue ~120)", () => {
    expect(colorForAvgStars(5)).toMatch(/hsl\(120,/);
  });

  it("clamp em valores fora de [1,5]", () => {
    expect(colorForAvgStars(0)).toMatch(/hsl\(0,/);
    expect(colorForAvgStars(10)).toMatch(/hsl\(120,/);
  });

  it("interpolação suave entre extremos", () => {
    const c2 = colorForAvgStars(2);
    const c4 = colorForAvgStars(4);
    // 2 → hue ~30 (amarelo-alaranjado)
    // 4 → hue ~90 (verde claro)
    expect(c2).toMatch(/hsl\(30,/);
    expect(c4).toMatch(/hsl\(90,/);
  });
});

describe("radiusForCount", () => {
  it("respeita o mínimo de 80m", () => {
    expect(radiusForCount(0)).toBe(80);
    expect(radiusForCount(1)).toBe(80);
  });

  it("cresce com o log do count", () => {
    const r10 = radiusForCount(10);
    const r100 = radiusForCount(100);
    const r1000 = radiusForCount(1000);
    expect(r10).toBeLessThan(r100);
    expect(r100).toBeLessThan(r1000);
  });

  it("respeita o máximo de 600m", () => {
    expect(radiusForCount(1_000_000)).toBe(600);
    expect(radiusForCount(10_000_000)).toBe(600);
  });
});
