import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));

import { __test__ } from "./useUsageHeatmap";
import type { HeatmapPoint } from "@/lib/reportsHeatmapData";

const { mergePoints, startDateFromPeriod } = __test__;

describe("startDateFromPeriod", () => {
  it("retorna ISO no passado de acordo com o período", () => {
    const iso7 = startDateFromPeriod("7d");
    const iso30 = startDateFromPeriod("30d");
    const iso90 = startDateFromPeriod("90d");
    const iso12m = startDateFromPeriod("12m");
    expect(typeof iso7).toBe("string");
    expect(new Date(iso7).getTime()).toBeLessThan(Date.now());
    expect(new Date(iso30).getTime()).toBeLessThan(new Date(iso7).getTime());
    expect(new Date(iso90).getTime()).toBeLessThan(new Date(iso30).getTime());
    expect(new Date(iso12m).getTime()).toBeLessThan(new Date(iso90).getTime());
  });

  it("retorna ISO válido", () => {
    const iso = startDateFromPeriod("30d");
    expect(() => new Date(iso).toISOString()).not.toThrow();
  });
});

describe("mergePoints", () => {
  it("retorna lista vazia quando todas as listas são vazias", () => {
    expect(mergePoints([], [], [])).toEqual([]);
  });

  it("preserva pontos quando coordenadas são distintas", () => {
    const a: HeatmapPoint[] = [{ lat: -23.5, lng: -46.6, weight: 1 }];
    const b: HeatmapPoint[] = [{ lat: -23.6, lng: -46.7, weight: 2 }];
    const merged = mergePoints(a, b);
    expect(merged).toHaveLength(2);
    expect(merged.find((p) => p.lat === -23.5)?.weight).toBe(1);
    expect(merged.find((p) => p.lat === -23.6)?.weight).toBe(2);
  });

  it("soma weights quando coordenadas coincidem (4 casas decimais)", () => {
    const a: HeatmapPoint[] = [{ lat: -23.5505, lng: -46.4861, weight: 3 }];
    const b: HeatmapPoint[] = [{ lat: -23.5505, lng: -46.4861, weight: 5 }];
    const merged = mergePoints(a, b);
    expect(merged).toHaveLength(1);
    expect(merged[0].weight).toBe(8);
  });

  it("agrupa pontos próximos no mesmo cell de 4 decimais", () => {
    const a: HeatmapPoint[] = [
      { lat: -23.55050, lng: -46.48610, weight: 1 },
      { lat: -23.55051, lng: -46.48611, weight: 2 }, // mesmo cell
      { lat: -23.5510, lng: -46.4870, weight: 3 }, // cell diferente
    ];
    const merged = mergePoints(a);
    expect(merged.length).toBeGreaterThanOrEqual(2);
    // O primeiro cell deve ter weight 3 (1+2)
    const firstCell = merged.find((p) => p.lat.toFixed(4) === "-23.5505");
    expect(firstCell?.weight).toBe(3);
  });

  it("combina múltiplas listas corretamente", () => {
    const urban: HeatmapPoint[] = [{ lat: -23.5, lng: -46.6, weight: 5 }];
    const evaluation: HeatmapPoint[] = [{ lat: -23.5, lng: -46.6, weight: 3 }];
    const visits: HeatmapPoint[] = [{ lat: -23.5, lng: -46.6, weight: 2 }];
    const transport: HeatmapPoint[] = [{ lat: -23.6, lng: -46.7, weight: 1 }];
    const merged = mergePoints(urban, evaluation, visits, transport);
    expect(merged).toHaveLength(2);
    const central = merged.find((p) => p.lat === -23.5);
    expect(central?.weight).toBe(10); // 5+3+2
    const other = merged.find((p) => p.lat === -23.6);
    expect(other?.weight).toBe(1);
  });
});
