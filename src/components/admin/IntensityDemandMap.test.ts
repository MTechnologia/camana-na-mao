import { describe, it, expect } from "vitest";
import { __test__ } from "./IntensityDemandMap";

const { colorForWait, radiusForCount } = __test__;

describe("colorForWait", () => {
  it("0h retorna verde puro (hue 120)", () => {
    expect(colorForWait(0)).toMatch(/hsl\(120,/);
  });

  it("metade do max retorna amarelo (hue ~60)", () => {
    expect(colorForWait(84, 168)).toMatch(/hsl\(60,/);
  });

  it("max ou mais retorna vermelho (hue 0)", () => {
    expect(colorForWait(168, 168)).toMatch(/hsl\(0,/);
    expect(colorForWait(500, 168)).toMatch(/hsl\(0,/);
  });

  it("respeita maxRedHours customizado", () => {
    // Com max 48h, 24h é metade → ~amarelo
    expect(colorForWait(24, 48)).toMatch(/hsl\(60,/);
  });
});

describe("radiusForCount", () => {
  it("respeita o mínimo de 600m", () => {
    expect(radiusForCount(0)).toBe(600);
    expect(radiusForCount(1)).toBe(600);
  });

  it("cresce com o log do count", () => {
    expect(radiusForCount(10)).toBeLessThan(radiusForCount(100));
    expect(radiusForCount(100)).toBeLessThan(radiusForCount(1000));
  });

  it("respeita o máximo de 4500m", () => {
    expect(radiusForCount(1_000_000)).toBe(4500);
  });
});
