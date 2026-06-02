import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  parseHeatmapRpcPayload,
  type HeatmapPoint,
  type ReportsHeatmapPayload,
} from "@/lib/reportsHeatmapData";

/**
 * HU-4.1 - Mapa de calor de "Uso total" da plataforma.
 *
 * Combina 4 fontes em um unico payload de pontos georreferenciados:
 *   1. urban_reports                -> RPC `get_usage_heatmap_data`
 *   2. service_ratings (avaliacoes) -> RPC `get_usage_heatmap_data`
 *   3. service_visits               -> RPC `get_usage_heatmap_data`
 *   4. transport_reports            -> RPC `get_usage_heatmap_data`
 *
 * A agregacao acontece no banco para nao limitar registros de origem nem
 * transferir linhas brutas para o navegador. A RPC devolve celulas ja agregadas.
 */

export type UsageHeatmapTypeFilter =
  | "all_usage"
  | "all_reports" // urban + evaluation (compativel com HU-4.1 atual)
  | "urban"
  | "evaluation"
  | "visits"
  | "transport";

export type UsageHeatmapPeriod = "7d" | "30d" | "90d" | "12m";

export interface UsageHeatmapBreakdown {
  urban: number;
  evaluation: number;
  visits: number;
  transport: number;
}

export interface UsageHeatmapPayload extends ReportsHeatmapPayload {
  /** Quantidade de celulas contribuida por cada fonte apos filtros. */
  breakdown: UsageHeatmapBreakdown;
}

const PERIOD_TO_DAYS: Record<UsageHeatmapPeriod, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "12m": 365,
};

const EMPTY_BREAKDOWN: UsageHeatmapBreakdown = {
  urban: 0,
  evaluation: 0,
  visits: 0,
  transport: 0,
};

function startDateFromPeriod(period: UsageHeatmapPeriod): string {
  const days = PERIOD_TO_DAYS[period];
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function toCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseUsageHeatmapRpcPayload(
  raw: unknown,
  period: UsageHeatmapPeriod,
): UsageHeatmapPayload | null {
  const parsed = parseHeatmapRpcPayload(raw);
  if (!parsed) return null;

  const rawBreakdown =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>).breakdown : null;
  const breakdownRecord =
    rawBreakdown && typeof rawBreakdown === "object"
      ? (rawBreakdown as Record<string, unknown>)
      : {};

  return {
    ...parsed,
    period: parsed.period || period,
    start_at: parsed.start_at || startDateFromPeriod(period),
    breakdown: {
      urban: toCount(breakdownRecord.urban),
      evaluation: toCount(breakdownRecord.evaluation),
      visits: toCount(breakdownRecord.visits),
      transport: toCount(breakdownRecord.transport),
    },
  };
}

/**
 * Combina pontos somando weights quando coincidem (4 casas de lat/lng).
 */
function mergePoints(...lists: HeatmapPoint[][]): HeatmapPoint[] {
  const map = new Map<string, HeatmapPoint>();
  lists.forEach((list) => {
    list.forEach((p) => {
      const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
      const slot = map.get(key) ?? { lat: p.lat, lng: p.lng, weight: 0 };
      slot.weight += p.weight;
      map.set(key, slot);
    });
  });
  return Array.from(map.values());
}

async function fetchUsageHeatmapData(
  typeFilter: UsageHeatmapTypeFilter,
  period: UsageHeatmapPeriod,
): Promise<UsageHeatmapPayload> {
  const { data, error } = await supabase.rpc("get_usage_heatmap_data", {
    p_type: typeFilter,
    p_period: period,
  });

  if (error) {
    throw error;
  }

  const parsed = parseUsageHeatmapRpcPayload(data, period);
  return (
    parsed ?? {
      period,
      start_at: startDateFromPeriod(period),
      points: [],
      truncated: false,
      breakdown: EMPTY_BREAKDOWN,
    }
  );
}

export function useUsageHeatmap(params: {
  typeFilter: UsageHeatmapTypeFilter;
  period: UsageHeatmapPeriod;
}) {
  const [data, setData] = useState<UsageHeatmapPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await fetchUsageHeatmapData(params.typeFilter, params.period);
      setData(payload);
    } catch (e) {
      console.error("[useUsageHeatmap]", e);
      setError(e instanceof Error ? e.message : "Erro ao carregar mapa de calor");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [params.typeFilter, params.period]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return { data, isLoading, error, refresh: fetchAll };
}

// Helpers exportados para teste
export const __test__ = {
  mergePoints,
  parseUsageHeatmapRpcPayload,
  startDateFromPeriod,
};
