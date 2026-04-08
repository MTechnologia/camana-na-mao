import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseHeatmapRpcPayload, type ReportsHeatmapPayload } from "@/lib/reportsHeatmapData";

export type ReportsHeatmapTypeFilter = "all" | "urban" | "transport" | "evaluation";
export type ReportsHeatmapPeriod = "7d" | "30d" | "90d" | "12m";

export function useReportsHeatmap(params: {
  typeFilter: ReportsHeatmapTypeFilter;
  period: ReportsHeatmapPeriod;
}) {
  const [data, setData] = useState<ReportsHeatmapPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHeatmap = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const p_type =
        params.typeFilter === "all" ? "all" : params.typeFilter === "transport" ? "transport" : params.typeFilter;

      const { data: rpcData, error: rpcError } = await supabase.rpc("get_reports_heatmap_data", {
        p_type,
        p_period: params.period,
      });

      if (rpcError) throw rpcError;

      const parsed = parseHeatmapRpcPayload(rpcData);
      setData(
        parsed ?? {
          period: params.period,
          start_at: "",
          points: [],
          truncated: false,
        }
      );
    } catch (e) {
      console.error("[useReportsHeatmap]", e);
      setError(e instanceof Error ? e.message : "Erro ao carregar mapa de calor");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [params.typeFilter, params.period]);

  useEffect(() => {
    void fetchHeatmap();
  }, [fetchHeatmap]);

  return { data, isLoading, error, refresh: fetchHeatmap };
}
