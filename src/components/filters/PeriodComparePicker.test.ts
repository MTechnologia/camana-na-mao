import { describe, it, expect } from "vitest";
import { computePeriodB } from "./PeriodComparePicker";

describe("computePeriodB", () => {
  it("retorna null se periodA não tem from/to", () => {
    expect(computePeriodB(undefined, "previous")).toBeNull();
    expect(computePeriodB({ from: undefined, to: undefined }, "previous")).toBeNull();
    expect(computePeriodB({ from: new Date("2026-01-01"), to: undefined }, "previous")).toBeNull();
  });

  it("preset 'previous' retorna janela imediatamente anterior com mesma duração", () => {
    const from = new Date(2026, 3, 1, 12, 0, 0);
    const to = new Date(2026, 3, 10, 12, 0, 0);
    const result = computePeriodB({ from, to }, "previous");
    expect(result).not.toBeNull();
    expect(result!.to.getDate()).toBe(31);
    expect(result!.to.getMonth()).toBe(2);
    const diffDays = Math.round(
      (result!.to.getTime() - result!.from.getTime()) / (1000 * 3600 * 24),
    );
    expect(diffDays).toBeGreaterThanOrEqual(9);
    expect(diffDays).toBeLessThanOrEqual(10);
  });

  it("preset 'year_ago' subtrai 1 ano de from e to", () => {
    const from = new Date("2026-04-15T00:00:00Z");
    const to = new Date("2026-05-15T00:00:00Z");
    const result = computePeriodB({ from, to }, "year_ago");
    expect(result).not.toBeNull();
    expect(result!.from.getFullYear()).toBe(2025);
    expect(result!.to.getFullYear()).toBe(2025);
    expect(result!.from.getMonth()).toBe(from.getMonth());
    expect(result!.from.getDate()).toBe(from.getDate());
  });

  it("preset 'custom' retorna customB", () => {
    const periodA = { from: new Date("2026-01-01"), to: new Date("2026-01-31") };
    const customB = { from: new Date("2024-06-01"), to: new Date("2024-06-30") };
    const result = computePeriodB(periodA, "custom", customB);
    expect(result).toEqual(customB);
  });

  it("preset 'custom' retorna null quando customB ausente", () => {
    const periodA = { from: new Date("2026-01-01"), to: new Date("2026-01-31") };
    expect(computePeriodB(periodA, "custom")).toBeNull();
    expect(computePeriodB(periodA, "custom", null)).toBeNull();
  });
});
