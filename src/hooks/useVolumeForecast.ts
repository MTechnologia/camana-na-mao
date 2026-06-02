import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import {
  densifyHistory,
  forecastVolume,
  pctDelta,
  sumForecast,
  sumLastHistory,
  type ForecastPoint,
  type ForecastResult,
  type VolumePoint,
} from "@/lib/forecastVolume";

/**
 * HU-9.2 — Hook que busca histórico diário de urban_reports + transport_reports
 * e aplica o util de forecast para retornar predições futuras.
 *
 * Estratégia de busca: select created_at de cada tabela nos últimos
 * `historyDays` dias, agrupa em memória por data local. Não usamos RPC pra
 * ficar simples; volume típico (<10k registros/mês) cabe tranquilamente.
 */

const TABLES = ["urban_reports", "transport_reports"] as const;
const REALTIME_TABLES = TABLES;
const DEFAULT_HISTORY_DAYS = 60;

export type ForecastHorizon = 7 | 14 | 30;

export interface ForecastSummary {
  /** Próximos N dias previstos, total. */
  total: number;
  /** Total no mesmo número de dias do histórico recente. */
  baseline: number;
  /** Variação percentual (positivo = aumento). */
  deltaPct: number;
  /** Dias considerados (7/14/30). */
  days: number;
}

export interface UseVolumeForecastResult {
  history: VolumePoint[];
  forecast: ForecastPoint[];
  diagnostics: ForecastResult["diagnostics"];
  summary: {
    next7: ForecastSummary;
    next14: ForecastSummary;
    next30: ForecastSummary;
  };
  isLoading: boolean;
  isInitialLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
}

interface FetchOptions {
  historyDays?: number;
  horizonDays?: ForecastHorizon;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Conta registros por data local usando created_at (ISO string).
 * Mantém em memória — bom para até ~100k registros (60 dias × ~1.5k/dia).
 */
async function fetchDailyCounts(
  table: "urban_reports" | "transport_reports",
  fromIso: string,
  toIso: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  // Paginado pra evitar limites do PostgREST (1000/req).
  const PAGE_SIZE = 1000;
  let offset = 0;
   
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("created_at")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = (data ?? []) as { created_at: string | null }[];
    if (batch.length === 0) break;
    for (const row of batch) {
      if (!row.created_at) continue;
      const d = new Date(row.created_at);
      const key = formatLocalDate(d);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return map;
}

export function useVolumeForecast(options: FetchOptions = {}): UseVolumeForecastResult {
  const historyDays = options.historyDays ?? DEFAULT_HISTORY_DAYS;
  const horizonDays = options.horizonDays ?? 30;

  const [history, setHistory] = useState<VolumePoint[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [diagnostics, setDiagnostics] = useState<ForecastResult["diagnostics"]>({
    trendSlope: 0,
    trendIntercept: 0,
    weekdayFactors: Array(7).fill(1),
    residualStdDev: 0,
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const today = startOfDay(new Date());
      const start = new Date(today);
      start.setDate(start.getDate() - historyDays);

      const fromIso = start.toISOString();
      const toIso = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();

      const [urban, transport] = await Promise.all([
        fetchDailyCounts("urban_reports", fromIso, toIso),
        fetchDailyCounts("transport_reports", fromIso, toIso),
      ]);

      // Combina os 2 mapas.
      const combined = new Map<string, number>();
      for (const [k, v] of urban) combined.set(k, (combined.get(k) ?? 0) + v);
      for (const [k, v] of transport) combined.set(k, (combined.get(k) ?? 0) + v);

      const sparse: VolumePoint[] = Array.from(combined.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Garante uma série contínua sem lacunas.
      const dense = densifyHistory(
        sparse,
        formatLocalDate(start),
        formatLocalDate(new Date(today.getTime() - 24 * 60 * 60 * 1000)),
      );

      const result = forecastVolume(dense, horizonDays);
      setHistory(result.history);
      setForecast(result.forecast);
      setDiagnostics(result.diagnostics);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("[useVolumeForecast] fetch error", err);
      setError("Não foi possível carregar o histórico de previsão.");
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [historyDays, horizonDays]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Realtime — refresh em novos relatos.
  useRealtimeRefresh(REALTIME_TABLES, fetchData);

  const summary = useMemo(() => {
    const buildSummary = (days: number): ForecastSummary => {
      const total = sumForecast(forecast, days);
      const baseline = sumLastHistory(history, days);
      return {
        total: Math.round(total),
        baseline,
        deltaPct: pctDelta(total, baseline),
        days,
      };
    };
    return {
      next7: buildSummary(7),
      next14: buildSummary(14),
      next30: buildSummary(30),
    };
  }, [forecast, history]);

  return {
    history,
    forecast,
    diagnostics,
    summary,
    isLoading,
    isInitialLoading,
    error,
    lastUpdate,
    refresh: fetchData,
  };
}
