import { describe, expect, it } from "vitest";
import {
  buildVisitCloseUpdate,
  formatVisitDurationMs,
  resolveDepartedAtIso,
} from "./closeServiceVisitDeparture";

describe("closeServiceVisitDeparture", () => {
  const fixed = new Date("2026-05-18T12:00:00.000Z");

  it("resolveDepartedAtIso retorna ISO quando ainda não há saída", () => {
    expect(resolveDepartedAtIso(null, fixed)).toBe(fixed.toISOString());
    expect(resolveDepartedAtIso(undefined, fixed)).toBe(fixed.toISOString());
  });

  it("resolveDepartedAtIso não sobrescreve saída existente (GPS)", () => {
    expect(resolveDepartedAtIso("2026-05-18T11:00:00.000Z", fixed)).toBeUndefined();
  });

  it("buildVisitCloseUpdate inclui departed_at só quando necessário", () => {
    expect(buildVisitCloseUpdate("completed", null, fixed)).toEqual({
      status: "completed",
      departed_at: fixed.toISOString(),
    });
    expect(buildVisitCloseUpdate("skipped", "2026-05-18T11:00:00.000Z", fixed)).toEqual({
      status: "skipped",
    });
  });

  it("formatVisitDurationMs trata duração sub-minuto", () => {
    expect(formatVisitDurationMs(0)).toBe("menos de 1 min");
    expect(formatVisitDurationMs(30_000)).toBe("menos de 1 min");
    expect(formatVisitDurationMs(90_000)).toBe("1 min");
    expect(formatVisitDurationMs(3_600_000)).toBe("1 h");
  });
});
