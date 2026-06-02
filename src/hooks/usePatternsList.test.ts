import { describe, it, expect } from "vitest";
import { peakHoursToVector, aggregatePeakHours } from "./usePatternsList";
import type { PatternEntry } from "./usePatternsList";

describe("peakHoursToVector", () => {
  it("retorna vetor 24 zeros quando peakHours é null", () => {
    const v = peakHoursToVector(null);
    expect(v).toHaveLength(24);
    expect(v.every((x) => x === 0)).toBe(true);
  });

  it("marca 1 nas horas informadas", () => {
    const v = peakHoursToVector([0, 8, 17, 23]);
    expect(v[0]).toBe(1);
    expect(v[8]).toBe(1);
    expect(v[17]).toBe(1);
    expect(v[23]).toBe(1);
    expect(v[1]).toBe(0);
    expect(v[10]).toBe(0);
  });

  it("ignora horas fora do range 0-23", () => {
    const v = peakHoursToVector([-1, 24, 100]);
    expect(v.every((x) => x === 0)).toBe(true);
  });

  it("ignora undefined", () => {
    const v = peakHoursToVector(undefined);
    expect(v).toHaveLength(24);
    expect(v.every((x) => x === 0)).toBe(true);
  });
});

describe("aggregatePeakHours", () => {
  function pattern(
    peakHours: number[] | null,
    overrides: Partial<PatternEntry> = {},
  ): PatternEntry {
    return {
      id: "x",
      description: "x",
      patternType: "t",
      status: "active",
      occurrenceCount: 1,
      averageSeverity: null,
      avgSeverity: null,
      suggestedAction: null,
      lineId: null,
      peakHours,
      firstDetectedAt: null,
      lastOccurrenceAt: null,
      lastAnalyzedAt: null,
      windowStart: null,
      windowEnd: null,
      ...overrides,
    };
  }

  it("soma vetores corretamente", () => {
    const out = aggregatePeakHours([
      pattern([8, 9, 10]),
      pattern([9, 10, 11]),
      pattern([10, 11, 12]),
    ]);
    expect(out[8]).toBe(1);
    expect(out[9]).toBe(2);
    expect(out[10]).toBe(3);
    expect(out[11]).toBe(2);
    expect(out[12]).toBe(1);
    expect(out[7]).toBe(0);
    expect(out[13]).toBe(0);
  });

  it("retorna vetor zerado quando lista vazia", () => {
    const out = aggregatePeakHours([]);
    expect(out).toHaveLength(24);
    expect(out.every((x) => x === 0)).toBe(true);
  });

  it("trata peakHours null sem quebrar", () => {
    const out = aggregatePeakHours([pattern(null), pattern([12])]);
    expect(out[12]).toBe(1);
  });
});
