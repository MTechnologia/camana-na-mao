import { describe, it, expect } from "vitest";
import {
  densifyHistory,
  forecastVolume,
  pctDelta,
  sumForecast,
  sumLastHistory,
  type VolumePoint,
} from "./forecastVolume";

/**
 * HU-9.2 — Testes do util de previsão.
 *
 * Cobre: tendência (slope), sazonalidade semanal (weekday_factor),
 * intervalo de confiança (>= 0 e upper >= prediction >= lower), e edge cases
 * (vazio, horizonte=0, série constante).
 */

// Gera série diária a partir de uma data inicial (gerador determinístico).
function buildSeries(
  startYmd: string,
  counts: number[],
): VolumePoint[] {
  const [y, m, d] = startYmd.split("-").map(Number);
  const out: VolumePoint[] = [];
  for (let i = 0; i < counts.length; i += 1) {
    const dt = new Date(y, m - 1, d + i);
    const ymd = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    out.push({ date: ymd, count: counts[i] });
  }
  return out;
}

describe("forecastVolume — entradas degeneradas", () => {
  it("retorna vazio quando o histórico está vazio", () => {
    const r = forecastVolume([], 7);
    expect(r.forecast).toEqual([]);
    expect(r.diagnostics.trendSlope).toBe(0);
    expect(r.diagnostics.residualStdDev).toBe(0);
  });

  it("retorna vazio quando horizonDays <= 0", () => {
    const hist = buildSeries("2026-04-01", [10, 12, 11]);
    const r = forecastVolume(hist, 0);
    expect(r.forecast).toEqual([]);
  });

  it("série constante: previsão é igual à média e slope ≈ 0", () => {
    // 28 dias com valor 100.
    const hist = buildSeries("2026-04-01", Array(28).fill(100));
    const r = forecastVolume(hist, 7);
    expect(r.diagnostics.trendSlope).toBeCloseTo(0, 5);
    // Todos os weekday_factor devem ser ≈ 1.
    for (const f of r.diagnostics.weekdayFactors) {
      expect(f).toBeCloseTo(1, 3);
    }
    for (const p of r.forecast) {
      expect(p.prediction).toBeCloseTo(100, 1);
    }
  });
});

describe("forecastVolume — tendência linear", () => {
  it("detecta tendência crescente (slope positivo)", () => {
    // 30 dias com count = 10 + i (crescente).
    const counts = Array.from({ length: 30 }, (_, i) => 10 + i);
    const hist = buildSeries("2026-04-01", counts);
    const r = forecastVolume(hist, 7);
    expect(r.diagnostics.trendSlope).toBeGreaterThan(0);
    expect(r.diagnostics.trendSlope).toBeCloseTo(1, 1);
    // Previsão do dia 1 deve ser próxima do trend extrapolado.
    // last index = 29, future idx 30 → trend = slope*30 + intercept ≈ 40.
    expect(r.forecast[0].prediction).toBeGreaterThan(35);
  });

  it("detecta tendência decrescente (slope negativo)", () => {
    const counts = Array.from({ length: 30 }, (_, i) => 100 - i);
    const hist = buildSeries("2026-04-01", counts);
    const r = forecastVolume(hist, 7);
    expect(r.diagnostics.trendSlope).toBeLessThan(0);
    // Não pode ir negativo na previsão.
    for (const p of r.forecast) {
      expect(p.prediction).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("forecastVolume — sazonalidade semanal", () => {
  it("captura padrão de dia da semana (fins de semana mais baixos)", () => {
    // 56 dias = 8 semanas. dia útil = 100, fim de semana = 30.
    const counts: number[] = [];
    const start = new Date(2026, 0, 5); // 5/jan/2026 = segunda
    for (let i = 0; i < 56; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dow = d.getDay();
      counts.push(dow === 0 || dow === 6 ? 30 : 100);
    }
    const hist = buildSeries("2026-01-05", counts);
    const r = forecastVolume(hist, 14);
    // Fator de domingo e sábado deve ser menor que 1.
    expect(r.diagnostics.weekdayFactors[0]).toBeLessThan(0.7); // domingo
    expect(r.diagnostics.weekdayFactors[6]).toBeLessThan(0.7); // sábado
    // Fatores de dia útil > 1.
    for (const dow of [1, 2, 3, 4, 5]) {
      expect(r.diagnostics.weekdayFactors[dow]).toBeGreaterThan(1.1);
    }
    // Previsão deve refletir padrão: dias úteis previstos > fins de semana.
    const weekdayPreds = r.forecast.filter(
      (p) => p.weekday !== 0 && p.weekday !== 6,
    );
    const weekendPreds = r.forecast.filter(
      (p) => p.weekday === 0 || p.weekday === 6,
    );
    const avgWeekday =
      weekdayPreds.reduce((a, p) => a + p.prediction, 0) / weekdayPreds.length;
    const avgWeekend =
      weekendPreds.reduce((a, p) => a + p.prediction, 0) / weekendPreds.length;
    expect(avgWeekday).toBeGreaterThan(avgWeekend * 2);
  });
});

describe("forecastVolume — intervalo de confiança", () => {
  it("upper >= prediction >= lower e lower nunca negativo", () => {
    // Série com ruído moderado.
    const counts: number[] = [];
    for (let i = 0; i < 40; i += 1) {
      counts.push(50 + Math.sin(i / 2) * 10);
    }
    const hist = buildSeries("2026-03-01", counts);
    const r = forecastVolume(hist, 14);
    for (const p of r.forecast) {
      expect(p.upper).toBeGreaterThanOrEqual(p.prediction - 1e-6);
      expect(p.prediction).toBeGreaterThanOrEqual(p.lower - 1e-6);
      expect(p.lower).toBeGreaterThanOrEqual(0);
    }
  });

  it("largura do IC ≈ 2 * 1.96 * stddev dos resíduos", () => {
    const counts: number[] = [];
    for (let i = 0; i < 40; i += 1) counts.push(100);
    const hist = buildSeries("2026-03-01", counts);
    const r = forecastVolume(hist, 7);
    // Série constante => stddev ≈ 0 => upper ≈ lower ≈ prediction.
    for (const p of r.forecast) {
      expect(Math.abs(p.upper - p.lower)).toBeLessThan(1);
    }
  });

  it("horizonte gera N pontos consecutivos sem buracos", () => {
    const hist = buildSeries(
      "2026-03-01",
      Array.from({ length: 30 }, () => 50),
    );
    const r = forecastVolume(hist, 30);
    expect(r.forecast).toHaveLength(30);
    // Datas estritamente crescentes.
    for (let i = 1; i < r.forecast.length; i += 1) {
      expect(r.forecast[i].date > r.forecast[i - 1].date).toBe(true);
    }
    // Primeiro ponto = dia seguinte ao último histórico.
    const last = hist[hist.length - 1].date;
    const [y, m, d] = last.split("-").map(Number);
    const nextDay = new Date(y, m - 1, d + 1);
    const expected = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, "0")}-${String(nextDay.getDate()).padStart(2, "0")}`;
    expect(r.forecast[0].date).toBe(expected);
  });
});

describe("densifyHistory", () => {
  it("preenche lacunas com 0", () => {
    const sparse: VolumePoint[] = [
      { date: "2026-05-01", count: 5 },
      { date: "2026-05-03", count: 7 },
    ];
    const dense = densifyHistory(sparse, "2026-05-01", "2026-05-04");
    expect(dense).toHaveLength(4);
    expect(dense[0]).toEqual({ date: "2026-05-01", count: 5 });
    expect(dense[1]).toEqual({ date: "2026-05-02", count: 0 });
    expect(dense[2]).toEqual({ date: "2026-05-03", count: 7 });
    expect(dense[3]).toEqual({ date: "2026-05-04", count: 0 });
  });

  it("retorna vazio quando start > end", () => {
    const sparse: VolumePoint[] = [{ date: "2026-05-01", count: 1 }];
    const dense = densifyHistory(sparse, "2026-05-10", "2026-05-01");
    expect(dense).toHaveLength(0);
  });
});

describe("sumForecast / sumLastHistory / pctDelta", () => {
  it("sumForecast soma apenas os primeiros N predictions", () => {
    const hist = buildSeries("2026-04-01", Array(28).fill(10));
    const r = forecastVolume(hist, 14);
    const s7 = sumForecast(r.forecast, 7);
    const s14 = sumForecast(r.forecast, 14);
    expect(s7).toBeGreaterThan(0);
    expect(s14).toBeGreaterThan(s7);
    expect(s14).toBeCloseTo(
      r.forecast.reduce((a, p) => a + p.prediction, 0),
      4,
    );
  });

  it("sumLastHistory soma os últimos N dias do histórico", () => {
    const hist = buildSeries(
      "2026-04-01",
      Array.from({ length: 30 }, (_, i) => i + 1),
    );
    // últimos 7 = 24+25+26+27+28+29+30 = 189
    expect(sumLastHistory(hist, 7)).toBe(189);
  });

  it("pctDelta retorna 0 quando ambos são 0", () => {
    expect(pctDelta(0, 0)).toBe(0);
  });

  it("pctDelta retorna 100 quando base é 0 e current > 0", () => {
    expect(pctDelta(10, 0)).toBe(100);
  });

  it("pctDelta calcula variação percentual normal", () => {
    expect(pctDelta(150, 100)).toBe(50);
    expect(pctDelta(80, 100)).toBe(-20);
  });
});
