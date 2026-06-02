/**
 * HU-9.2 — Previsão de volume diário usando decomposição simples:
 *   forecast(t) = trend(t) * weekday_factor(dow(t))
 *
 * Sem dependências externas. Estratégia:
 *   1. Calcula uma reta de tendência via mínimos quadrados sobre a série
 *      histórica (count vs índice do dia).
 *   2. Para cada dia da semana (0=domingo .. 6=sábado), calcula o fator
 *      sazonal = média(observed / trend) restrito àquele dow.
 *   3. Para cada dia futuro: previsao = trend_futura * weekday_factor[dow].
 *   4. Intervalo de confiança: prediction ± k * stddev(resíduos),
 *      onde resíduos = observed - (trend × weekday_factor) no histórico.
 *      Usa k=1.96 (≈ 95%).
 *
 * Tudo é puro e determinístico para a mesma entrada — fácil de testar.
 */

export interface VolumePoint {
  /** "YYYY-MM-DD" (data local). */
  date: string;
  count: number;
}

export interface ForecastPoint {
  date: string;
  prediction: number;
  /** Limite inferior do intervalo de confiança (>= 0). */
  lower: number;
  /** Limite superior do intervalo de confiança. */
  upper: number;
  /** Dia da semana (0=domingo .. 6=sábado). */
  weekday: number;
}

export interface ForecastResult {
  history: VolumePoint[];
  forecast: ForecastPoint[];
  /** Métricas do modelo, úteis para depurar e mostrar transparência. */
  diagnostics: {
    trendSlope: number;
    trendIntercept: number;
    weekdayFactors: number[]; // 7 posições, 0=domingo
    residualStdDev: number;
  };
}

const Z_95 = 1.96;

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Mínimos quadrados — retorna {slope, intercept}. */
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function clampPositive(v: number): number {
  return v < 0 ? 0 : v;
}

/**
 * Calcula previsões para os próximos `horizonDays` dias após o último ponto
 * de `history`. `history` precisa estar ORDENADO ascendentemente por data
 * e contínuo (sem lacunas). Use `densifyHistory` para garantir isso.
 */
export function forecastVolume(history: VolumePoint[], horizonDays: number): ForecastResult {
  // Defesa: histórico vazio não tem o que ajustar.
  // Obs.: horizonDays <= 0 é VÁLIDO — produz forecast vazio (o laço abaixo não
  // executa) mas ainda calcula os diagnostics. detectAnomalies depende disso
  // (chama forecastVolume(history, 0) só para obter trend/weekday/residualStdDev).
  if (history.length === 0) {
    return {
      history,
      forecast: [],
      diagnostics: {
        trendSlope: 0,
        trendIntercept: 0,
        weekdayFactors: Array(7).fill(1),
        residualStdDev: 0,
      },
    };
  }

  const counts = history.map((p) => p.count);
  const { slope, intercept } = linearRegression(counts);

  // Trend para cada índice histórico.
  const trendValues = counts.map((_, i) => slope * i + intercept);

  // Fator sazonal por dia-da-semana: média dos resíduos multiplicativos.
  const weekdaySums = Array(7).fill(0);
  const weekdayCounts = Array(7).fill(0);
  history.forEach((p, i) => {
    const dow = parseLocalDate(p.date).getDay();
    const t = trendValues[i];
    if (t > 0.0001) {
      weekdaySums[dow] += p.count / t;
      weekdayCounts[dow] += 1;
    }
  });
  const weekdayFactors = weekdaySums.map((sum, i) =>
    weekdayCounts[i] > 0 ? sum / weekdayCounts[i] : 1,
  );

  // Resíduos: observed - (trend * weekday_factor).
  const residuals: number[] = [];
  history.forEach((p, i) => {
    const dow = parseLocalDate(p.date).getDay();
    const fitted = trendValues[i] * weekdayFactors[dow];
    residuals.push(p.count - fitted);
  });
  const meanRes = residuals.reduce((a, b) => a + b, 0) / Math.max(1, residuals.length);
  const variance =
    residuals.reduce((a, b) => a + (b - meanRes) ** 2, 0) / Math.max(1, residuals.length - 1);
  const residualStdDev = Math.sqrt(variance);

  // Forecast.
  const lastDate = parseLocalDate(history[history.length - 1].date);
  const lastIndex = history.length - 1;
  const forecast: ForecastPoint[] = [];
  for (let h = 1; h <= horizonDays; h += 1) {
    const futureIdx = lastIndex + h;
    const trendFuture = slope * futureIdx + intercept;
    const date = formatLocalDate(addDays(lastDate, h));
    const dow = parseLocalDate(date).getDay();
    const prediction = clampPositive(trendFuture * weekdayFactors[dow]);
    const half = Z_95 * residualStdDev;
    forecast.push({
      date,
      prediction,
      lower: clampPositive(prediction - half),
      upper: clampPositive(prediction + half),
      weekday: dow,
    });
  }

  return {
    history,
    forecast,
    diagnostics: {
      trendSlope: slope,
      trendIntercept: intercept,
      weekdayFactors,
      residualStdDev,
    },
  };
}

/**
 * Garante que o histórico não tenha lacunas: preenche dias faltantes com 0.
 * `start` e `end` são "YYYY-MM-DD" inclusivos. Útil quando vem do banco sem
 * registros em dias sem nenhum relato.
 */
export function densifyHistory(sparse: VolumePoint[], start: string, end: string): VolumePoint[] {
  const map = new Map(sparse.map((p) => [p.date, p.count]));
  const out: VolumePoint[] = [];
  const cur = parseLocalDate(start);
  const last = parseLocalDate(end);
  while (cur.getTime() <= last.getTime()) {
    const k = formatLocalDate(cur);
    out.push({ date: k, count: map.get(k) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Soma os valores previstos em uma janela específica do forecast. */
export function sumForecast(forecast: ForecastPoint[], days: number): number {
  return forecast.slice(0, days).reduce((acc, p) => acc + p.prediction, 0);
}

/** Soma valores históricos dos últimos N dias. */
export function sumLastHistory(history: VolumePoint[], days: number): number {
  return history.slice(-days).reduce((acc, p) => acc + p.count, 0);
}

/** Calcula delta percentual entre 2 totais (preserva sinal). */
export function pctDelta(current: number, base: number): number {
  if (base === 0) return current === 0 ? 0 : 100;
  return ((current - base) / base) * 100;
}
