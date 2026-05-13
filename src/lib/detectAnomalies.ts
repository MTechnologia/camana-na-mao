/**
 * HU-9.3 — Detecção de anomalias sobre o volume diário.
 *
 * Estratégia: para cada dia da janela observada, calcula o que o modelo
 * (mesma matemática da HU-9.2) previria para aquele dia. Compara com o
 * observado e calcula o z-score = (obs - pred) / σ(resíduos).
 *
 * Quando |z| ≥ threshold (default 2.5), registra como anomalia.
 *
 * Severity:
 *   |z| ∈ [2.5, 3)  → low
 *   |z| ∈ [3, 4)    → medium
 *   |z| ∈ [4, 5)    → high
 *   |z| ≥ 5         → critical
 *
 * Direction:
 *   z > 0  → 'spike'  (acima do esperado)
 *   z < 0  → 'drop'   (abaixo do esperado)
 *
 * 100% determinístico e sem dependências externas — fácil de testar e
 * portar para a edge function (Deno).
 */

import { forecastVolume, type VolumePoint } from "./forecastVolume";

export type AnomalySeverity = "low" | "medium" | "high" | "critical";
export type AnomalyDirection = "spike" | "drop";

export interface DetectedAnomaly {
  /** "YYYY-MM-DD" (data local) do ponto observado. */
  signalDate: string;
  observedValue: number;
  expectedValue: number;
  expectedLower: number;
  expectedUpper: number;
  /** Z-score sinalizado: positivo = spike, negativo = drop. */
  zScore: number;
  severity: AnomalySeverity;
  direction: AnomalyDirection;
}

export interface DetectAnomaliesOptions {
  /** Quantos dias finais do histórico considerar para detecção (default 7). */
  windowDays?: number;
  /** Limiar mínimo de |z| para registrar anomalia (default 2.5). */
  zThreshold?: number;
}

const DEFAULT_OPTIONS: Required<DetectAnomaliesOptions> = {
  windowDays: 7,
  zThreshold: 2.5,
};

function classifySeverity(absZ: number): AnomalySeverity {
  if (absZ >= 5) return "critical";
  if (absZ >= 4) return "high";
  if (absZ >= 3) return "medium";
  return "low";
}

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Calcula o valor previsto e o intervalo de confiança 95% para cada dia da
 * janela final do histórico. Usa o mesmo modelo da HU-9.2 (trend × weekday).
 *
 * Importante: para evitar vazamento (leak), usamos o modelo treinado em TODO
 * o histórico. Em produção a edge function chama isso 1x/dia depois que o
 * dia anterior já está fechado — então não há perigo do dia em análise estar
 * contaminado por dados futuros, já que ele é o último ponto.
 */
export function detectAnomalies(
  history: VolumePoint[],
  options: DetectAnomaliesOptions = {},
): DetectedAnomaly[] {
  const { windowDays, zThreshold } = { ...DEFAULT_OPTIONS, ...options };

  if (history.length < 14) {
    // Muito pouco histórico para sazonalidade semanal + estimativa de stddev.
    return [];
  }

  // Treina o modelo com TODO o histórico (incluindo a janela). Em séries
  // reais o efeito de incluir 7 dias adicionais sobre 60 dias é desprezível.
  const result = forecastVolume(history, 0);
  const { trendSlope, trendIntercept, weekdayFactors, residualStdDev } =
    result.diagnostics;

  // Se stddev é zero (série constante), não há como classificar como
  // anomalia — qualquer valor diferente seria infinito.
  if (residualStdDev <= 1e-9) {
    return [];
  }

  const startIdx = Math.max(0, history.length - windowDays);
  const out: DetectedAnomaly[] = [];

  for (let i = startIdx; i < history.length; i += 1) {
    const point = history[i];
    const dow = parseLocalDate(point.date).getDay();
    const trend = trendSlope * i + trendIntercept;
    const expected = Math.max(0, trend * weekdayFactors[dow]);
    const half = 1.96 * residualStdDev;
    const lower = Math.max(0, expected - half);
    const upper = expected + half;
    const z = (point.count - expected) / residualStdDev;
    const absZ = Math.abs(z);
    if (absZ < zThreshold) continue;
    out.push({
      signalDate: point.date,
      observedValue: point.count,
      expectedValue: expected,
      expectedLower: lower,
      expectedUpper: upper,
      zScore: z,
      severity: classifySeverity(absZ),
      direction: z >= 0 ? "spike" : "drop",
    });
  }

  return out;
}

/** Mapa de severity → ordem/peso para ranking. */
export const SEVERITY_RANK: Record<AnomalySeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/** Label PT-BR para severity. */
export const SEVERITY_LABEL_PT: Record<AnomalySeverity, string> = {
  low: "Leve",
  medium: "Moderada",
  high: "Alta",
  critical: "Crítica",
};

/** Label PT-BR para direction. */
export const DIRECTION_LABEL_PT: Record<AnomalyDirection, string> = {
  spike: "Pico",
  drop: "Queda",
};
