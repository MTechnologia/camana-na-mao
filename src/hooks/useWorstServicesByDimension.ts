import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  parseWorstServicesByDimensionPayload,
  type WorstServicesByDimensionPayload,
} from "@/lib/evaluationDimensionRankings";
import type { ServiceRatingDimensionKey } from "@/lib/serviceRatingDimensions";

export type DimensionRankingPeriod = "7d" | "30d" | "90d" | "12m";

export function useWorstServicesByDimension(params: {
  dimension: ServiceRatingDimensionKey;
  period: DimensionRankingPeriod;
  limit: number;
}) {
  const [data, setData] = useState<WorstServicesByDimensionPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRankings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const lim = Math.min(100, Math.max(1, Math.floor(params.limit)));
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_worst_services_by_dimension", {
        p_dimension: params.dimension,
        p_period: params.period,
        p_limit: lim,
      });

      if (rpcError) throw rpcError;

      const parsed = parseWorstServicesByDimensionPayload(rpcData);
      setData(
        parsed ?? {
          dimension: params.dimension,
          period: params.period,
          limit: lim,
          start_at: "",
          items: [],
        },
      );
    } catch (e) {
      console.error("[useWorstServicesByDimension]", e);
      setError(e instanceof Error ? e.message : "Erro ao carregar ranking");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [params.dimension, params.period, params.limit]);

  useEffect(() => {
    void fetchRankings();
  }, [fetchRankings]);

  return { data, isLoading, error, refresh: fetchRankings };
}
