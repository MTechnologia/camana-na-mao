import { describe, it, expect } from "vitest";
import { __test__ } from "./useReportsVolumeCompare";
import type { VolumeByCategory } from "./useReportsVolume";

const { computeDelta, buildCategoryCompare } = __test__;

describe("computeDelta", () => {
  it("retorna 0/0 quando ambos são 0", () => {
    expect(computeDelta(0, 0)).toEqual({ absolute: 0, percent: 0 });
  });

  it("retorna +100% quando A=0 e B>0", () => {
    expect(computeDelta(0, 5)).toEqual({ absolute: 5, percent: 100 });
  });

  it("calcula percent corretamente para crescimento", () => {
    expect(computeDelta(100, 150)).toEqual({ absolute: 50, percent: 50 });
    expect(computeDelta(10, 13)).toEqual({ absolute: 3, percent: 30 });
  });

  it("calcula percent corretamente para queda", () => {
    expect(computeDelta(100, 80)).toEqual({ absolute: -20, percent: -20 });
    expect(computeDelta(50, 25)).toEqual({ absolute: -25, percent: -50 });
  });

  it("absoluto pode ser negativo mesmo com 0%", () => {
    const { absolute, percent } = computeDelta(100, 100);
    expect(absolute).toBe(0);
    expect(percent).toBe(0);
  });
});

function cat(category: string, count: number, source: "urbano" | "transporte" | "avaliacao" = "urbano"): VolumeByCategory {
  return { category, count, source };
}

describe("buildCategoryCompare", () => {
  it("retorna lista vazia quando ambos os lados são vazios", () => {
    expect(buildCategoryCompare([], [])).toEqual([]);
  });

  it("inclui categoria que existe só em A", () => {
    const rows = buildCategoryCompare([cat("Iluminação", 10)], []);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ category: "Iluminação", countA: 10, countB: 0 });
  });

  it("inclui categoria que existe só em B", () => {
    const rows = buildCategoryCompare([], [cat("Buracos", 5)]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ category: "Buracos", countA: 0, countB: 5, deltaPercent: 100 });
  });

  it("calcula deltaPercent corretamente para categorias presentes em ambos", () => {
    const rows = buildCategoryCompare([cat("Iluminação", 100)], [cat("Iluminação", 150)]);
    expect(rows[0].deltaPercent).toBe(50);
  });

  it("ordena por soma A+B descendente", () => {
    const rows = buildCategoryCompare(
      [cat("A", 5), cat("B", 100)],
      [cat("A", 5), cat("B", 50)],
    );
    expect(rows[0].category).toBe("B");
    expect(rows[1].category).toBe("A");
  });

  it("respeita o limit", () => {
    const a: VolumeByCategory[] = Array.from({ length: 20 }, (_, i) => cat(`cat${i}`, 100 - i));
    const rows = buildCategoryCompare(a, [], 5);
    expect(rows).toHaveLength(5);
  });

  it("ignora categoria com count 0 em ambos", () => {
    const rows = buildCategoryCompare([cat("Empty", 0)], [cat("Empty", 0)]);
    expect(rows).toHaveLength(0);
  });
});
