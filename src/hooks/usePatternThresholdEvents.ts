import { useCallback, useEffect, useState } from "react";
import type { PatternAlert } from "@/components/analytics/PatternAlerts";
import { supabase } from "@/integrations/supabase/client";
import {
  mapThresholdEventsToPatternAlerts,
  type ReportPatternThresholdEventRow,
} from "@/lib/patternThresholdEvents";

export type UsePatternThresholdEventsOptions = {
  limit?: number;
  /** Quando false, não busca eventos até a aba que usa alertas estar ativa. Default: true. */
  enabled?: boolean;
};

export function usePatternThresholdEvents(arg?: number | UsePatternThresholdEventsOptions) {
  const limit = typeof arg === "number" ? arg : (arg?.limit ?? 8);
  const enabled = typeof arg === "number" ? true : (arg?.enabled ?? true);

  const [alerts, setAlerts] = useState<PatternAlert[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("report_pattern_threshold_events")
        .select("*")
        .order("window_end", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (queryError) throw queryError;

      setAlerts(
        mapThresholdEventsToPatternAlerts((data ?? []) as ReportPatternThresholdEventRow[]),
      );
    } catch (err) {
      console.error("[usePatternThresholdEvents]", err);
      setAlerts([]);
      setError(err instanceof Error ? err.message : "Erro ao carregar alertas de padrões");
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void fetchAlerts();
  }, [enabled, fetchAlerts]);

  return { alerts, isLoading, error, refresh: fetchAlerts };
}
