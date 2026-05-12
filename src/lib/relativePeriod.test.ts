import { describe, it, expect } from "vitest";
import {
  RELATIVE_PERIOD_LABELS,
  RELATIVE_PERIOD_OPTIONS,
  formatPeriodPtBr,
  periodToIso,
  resolveRelativePeriod,
} from "./relativePeriod";

// Base fixa: terça, 12 de maio de 2026, 10:30 (horário local).
const BASE = new Date(2026, 4, 12, 10, 30, 0, 0);

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("RELATIVE_PERIOD_LABELS / OPTIONS", () => {
  it("cobre todas as 7 chaves canônicas", () => {
    expect(Object.keys(RELATIVE_PERIOD_LABELS)).toHaveLength(7);
    expect(RELATIVE_PERIOD_OPTIONS).toHaveLength(7);
  });

  it("labels são PT-BR amigáveis", () => {
    expect(RELATIVE_PERIOD_LABELS.yesterday).toBe("Ontem");
    expect(RELATIVE_PERIOD_LABELS.last_7d).toBe("Últimos 7 dias");
  });
});

describe("resolveRelativePeriod", () => {
  it("'yesterday' retorna o dia anterior inteiro", () => {
    const p = resolveRelativePeriod("yesterday", BASE);
    expect(dayKey(p.startDate)).toBe("2026-05-11");
    expect(dayKey(p.endDate)).toBe("2026-05-11");
    expect(p.startDate.getHours()).toBe(0);
    expect(p.endDate.getHours()).toBe(23);
  });

  it("'last_7d' retorna 7 dias antes do dia atual, sem incluir hoje", () => {
    const p = resolveRelativePeriod("last_7d", BASE);
    // Base = 12/05. last_7d: 05/05 → 11/05.
    expect(dayKey(p.startDate)).toBe("2026-05-05");
    expect(dayKey(p.endDate)).toBe("2026-05-11");
  });

  it("'last_30d' retorna 30 dias antes, sem incluir hoje", () => {
    const p = resolveRelativePeriod("last_30d", BASE);
    expect(dayKey(p.startDate)).toBe("2026-04-12");
    expect(dayKey(p.endDate)).toBe("2026-05-11");
  });

  it("'previous_month' retorna o mês anterior completo", () => {
    const p = resolveRelativePeriod("previous_month", BASE);
    expect(dayKey(p.startDate)).toBe("2026-04-01");
    expect(dayKey(p.endDate)).toBe("2026-04-30");
  });

  it("'current_month' retorna do dia 1 até a base", () => {
    const p = resolveRelativePeriod("current_month", BASE);
    expect(dayKey(p.startDate)).toBe("2026-05-01");
    // O fim é endOfDay(base) → mesmo dia
    expect(dayKey(p.endDate)).toBe("2026-05-12");
  });

  it("'last_quarter' retorna o trimestre anterior (Q1/2026 quando base=maio)", () => {
    const p = resolveRelativePeriod("last_quarter", BASE);
    expect(dayKey(p.startDate)).toBe("2026-01-01");
    expect(dayKey(p.endDate)).toBe("2026-03-31");
  });

  it("'last_year' retorna o ano calendário anterior", () => {
    const p = resolveRelativePeriod("last_year", BASE);
    expect(dayKey(p.startDate)).toBe("2025-01-01");
    expect(dayKey(p.endDate)).toBe("2025-12-31");
  });

  it("usa Date.now() como default quando baseDate é omitido", () => {
    const p = resolveRelativePeriod("yesterday");
    // Só verifica que retorna data válida e que a janela é < 48h.
    const diffH = (p.endDate.getTime() - p.startDate.getTime()) / 3600000;
    expect(diffH).toBeGreaterThan(23);
    expect(diffH).toBeLessThan(25);
  });
});

describe("periodToIso / formatPeriodPtBr", () => {
  it("periodToIso converte para ISO strings", () => {
    const p = resolveRelativePeriod("yesterday", BASE);
    const iso = periodToIso(p);
    expect(iso.startDate).toMatch(/^2026-05-11T/);
    expect(iso.endDate).toMatch(/^2026-05-11T/);
  });

  it("formatPeriodPtBr formata como 'DD/MM/YYYY → DD/MM/YYYY'", () => {
    const p = resolveRelativePeriod("last_7d", BASE);
    expect(formatPeriodPtBr(p)).toBe("05/05/2026 → 11/05/2026");
  });
});
