import { describe, it, expect } from "vitest";
import {
  detectAnomalies,
  DIRECTION_LABEL_PT,
  SEVERITY_LABEL_PT,
  SEVERITY_RANK,
} from "./detectAnomalies";
import type { VolumePoint } from "./forecastVolume";

/**
 * HU-9.3 — Testes da detecção de anomalias.
 */

function buildSeries(startYmd: string, counts: number[]): VolumePoint[] {
  const [y, m, d] = startYmd.split("-").map(Number);
  const out: VolumePoint[] = [];
  for (let i = 0; i < counts.length; i += 1) {
    const dt = new Date(y, m - 1, d + i);
    const ymd = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    out.push({ date: ymd, count: counts[i] });
  }
  return out;
}

describe("detectAnomalies — guardas", () => {
  it("retorna vazio para histórico curto demais (< 14 dias)", () => {
    const hist = buildSeries(
      "2026-05-01",
      Array.from({ length: 10 }, () => 100),
    );
    expect(detectAnomalies(hist)).toEqual([]);
  });

  it("retorna vazio para série completamente constante (stddev = 0)", () => {
    const hist = buildSeries(
      "2026-04-01",
      Array.from({ length: 40 }, () => 100),
    );
    expect(detectAnomalies(hist)).toEqual([]);
  });
});

describe("detectAnomalies — detecção", () => {
  it("detecta spike claro (último dia muito acima)", () => {
    // 40 dias com média ~50 e ruído baixo; último dia = 1000.
    const counts: number[] = [];
    for (let i = 0; i < 39; i += 1) {
      counts.push(50 + (i % 7 === 3 ? 5 : -2));
    }
    counts.push(1000);
    const hist = buildSeries("2026-04-01", counts);
    const anomalies = detectAnomalies(hist);
    expect(anomalies.length).toBeGreaterThanOrEqual(1);
    const last = anomalies.find(
      (a) => a.signalDate === hist[hist.length - 1].date,
    );
    expect(last).toBeDefined();
    expect(last?.direction).toBe("spike");
    expect(last?.zScore).toBeGreaterThan(2.5);
    expect(last?.observedValue).toBe(1000);
  });

  it("detecta drop claro (último dia muito abaixo)", () => {
    const counts: number[] = [];
    for (let i = 0; i < 39; i += 1) {
      counts.push(80 + (i % 7 === 3 ? 5 : -2));
    }
    counts.push(0);
    const hist = buildSeries("2026-04-01", counts);
    const anomalies = detectAnomalies(hist);
    const last = anomalies.find(
      (a) => a.signalDate === hist[hist.length - 1].date,
    );
    expect(last?.direction).toBe("drop");
    expect(last?.zScore).toBeLessThan(0);
  });

  it("não detecta nada em série estável dentro do esperado", () => {
    // Série com ruído pequeno e sem outlier.
    const counts: number[] = [];
    for (let i = 0; i < 40; i += 1) {
      const dow = new Date(2026, 3, 1 + i).getDay();
      const base = dow === 0 || dow === 6 ? 30 : 100;
      counts.push(base + (i % 3) - 1);
    }
    const hist = buildSeries("2026-04-01", counts);
    const anomalies = detectAnomalies(hist);
    expect(anomalies.length).toBe(0);
  });
});

describe("detectAnomalies — classificação de severity", () => {
  it("classifica corretamente conforme |z|", () => {
    // Constrói séries onde o último dia produz z-score específico.
    // Estratégia: 40 dias com count=100 com ruído ±1 (stddev ~1), e último
    // dia em valores 103, 104, 105, 106 (z ≈ 3, 4, 5, 6).
    function buildWith(lastValue: number): VolumePoint[] {
      const counts: number[] = [];
      for (let i = 0; i < 39; i += 1) {
        counts.push(100 + (i % 2 === 0 ? 1 : -1));
      }
      counts.push(lastValue);
      return buildSeries("2026-04-01", counts);
    }
    const lowOrMedium = detectAnomalies(buildWith(105));
    expect(lowOrMedium.length).toBeGreaterThan(0);
    // |z| ~5 → critical, |z| ~3-4 → medium/high. Aceita medium ou high.
    const last = lowOrMedium[lowOrMedium.length - 1];
    expect(["medium", "high", "critical"]).toContain(last.severity);
    expect(last.direction).toBe("spike");
  });

  it("severity 'critical' apenas para |z| muito alto", () => {
    const counts: number[] = [];
    for (let i = 0; i < 39; i += 1) counts.push(100 + (i % 2 === 0 ? 1 : -1));
    counts.push(500);
    const hist = buildSeries("2026-04-01", counts);
    const anomalies = detectAnomalies(hist);
    const last = anomalies[anomalies.length - 1];
    expect(last.severity).toBe("critical");
    expect(Math.abs(last.zScore)).toBeGreaterThanOrEqual(5);
  });
});

describe("detectAnomalies — janela e threshold", () => {
  it("respeita windowDays (não detecta fora da janela)", () => {
    // 40 dias; o spike é no dia 10 (fora da janela default 7).
    const counts: number[] = [];
    for (let i = 0; i < 40; i += 1) counts.push(50);
    counts[10] = 500;
    const hist = buildSeries("2026-04-01", counts);
    const anomalies = detectAnomalies(hist, { windowDays: 7 });
    expect(
      anomalies.some((a) => a.signalDate === hist[10].date),
    ).toBe(false);
  });

  it("aumentar zThreshold reduz número de detecções", () => {
    const counts: number[] = [];
    for (let i = 0; i < 39; i += 1) counts.push(100 + (i % 2 === 0 ? 1 : -1));
    counts.push(105); // ~moderate z
    const hist = buildSeries("2026-04-01", counts);
    const loose = detectAnomalies(hist, { zThreshold: 2 });
    const strict = detectAnomalies(hist, { zThreshold: 4 });
    expect(loose.length).toBeGreaterThanOrEqual(strict.length);
  });
});

describe("detectAnomalies — campos do output", () => {
  it("retorna IC consistente (lower <= expected <= upper, lower >= 0)", () => {
    const counts: number[] = [];
    for (let i = 0; i < 39; i += 1) counts.push(100 + (i % 2 === 0 ? 1 : -1));
    counts.push(500);
    const hist = buildSeries("2026-04-01", counts);
    const [a] = detectAnomalies(hist);
    expect(a.expectedLower).toBeLessThanOrEqual(a.expectedValue + 1e-6);
    expect(a.expectedValue).toBeLessThanOrEqual(a.expectedUpper + 1e-6);
    expect(a.expectedLower).toBeGreaterThanOrEqual(0);
  });
});

describe("Constantes auxiliares", () => {
  it("SEVERITY_RANK ordena corretamente", () => {
    expect(SEVERITY_RANK.low).toBeLessThan(SEVERITY_RANK.medium);
    expect(SEVERITY_RANK.medium).toBeLessThan(SEVERITY_RANK.high);
    expect(SEVERITY_RANK.high).toBeLessThan(SEVERITY_RANK.critical);
  });

  it("SEVERITY_LABEL_PT cobre todos os níveis", () => {
    expect(SEVERITY_LABEL_PT.low).toBe("Leve");
    expect(SEVERITY_LABEL_PT.medium).toBe("Moderada");
    expect(SEVERITY_LABEL_PT.high).toBe("Alta");
    expect(SEVERITY_LABEL_PT.critical).toBe("Crítica");
  });

  it("DIRECTION_LABEL_PT cobre spike e drop", () => {
    expect(DIRECTION_LABEL_PT.spike).toBe("Pico");
    expect(DIRECTION_LABEL_PT.drop).toBe("Queda");
  });
});
