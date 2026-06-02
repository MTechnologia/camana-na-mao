import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TrendPoint } from "@/lib/buildTrendChartRows";

export type ReportsTrendTypeFilter = "all" | "urban" | "transport" | "evaluation";
export type ReportsTrendPeriod = "7d" | "30d" | "90d" | "12m";

export type ReportsTrendPayload = {
  granularity: string;
  period: string;
  start_at: string;
  points: TrendPoint[];
};

const parseRpcPayload = (raw: unknown): ReportsTrendPayload | null => {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const pointsRaw = o.points;
  if (!Array.isArray(pointsRaw)) return null;
  const points: TrendPoint[] = pointsRaw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const bucket =
        typeof r.bucket === "string" ? r.bucket : r.bucket != null ? String(r.bucket) : "";
      const category = typeof r.category === "string" ? r.category : String(r.category ?? "");
      const count = typeof r.count === "number" ? r.count : Number(r.count);
      if (!bucket || !category || Number.isNaN(count)) return null;
      return { bucket, category, count };
    })
    .filter((p): p is TrendPoint => p !== null);

  return {
    granularity: typeof o.granularity === "string" ? o.granularity : "day",
    period: typeof o.period === "string" ? o.period : "",
    start_at: typeof o.start_at === "string" ? o.start_at : String(o.start_at ?? ""),
    points,
  };
};

export function useReportsTrend(params: {
  typeFilter: ReportsTrendTypeFilter;
  lineId: string | null;
  period: ReportsTrendPeriod;
}) {
  const [data, setData] = useState<ReportsTrendPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrend = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const p_type = params.typeFilter === "all" ? null : params.typeFilter;
      const p_line_id =
        params.typeFilter === "transport" || params.typeFilter === "all"
          ? params.lineId || null
          : null;

      const { data: rpcData, error: rpcError } = await supabase.rpc("get_reports_trend", {
        p_type,
        p_line_id,
        p_period: params.period,
      });

      if (rpcError) throw rpcError;

      const parsed = parseRpcPayload(rpcData);
      setData(parsed ?? { granularity: "day", period: params.period, start_at: "", points: [] });
    } catch (e) {
      console.error("[useReportsTrend]", e);
      setError(e instanceof Error ? e.message : "Erro ao carregar tendência");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [params.typeFilter, params.lineId, params.period]);

  useEffect(() => {
    void fetchTrend();
  }, [fetchTrend]);

  return { data, isLoading, error, refresh: fetchTrend };
}
