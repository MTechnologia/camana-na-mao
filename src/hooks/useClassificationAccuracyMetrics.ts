import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AccuracyBySourceRow =
  Database["public"]["Views"]["v_classification_accuracy_by_source"]["Row"];
export type PredictionVsFeedbackRow =
  Database["public"]["Views"]["v_classification_prediction_vs_feedback"]["Row"];
export type PredictionsPendingRow =
  Database["public"]["Views"]["v_classification_predictions_pending"]["Row"];

export interface ClassificationAccuracySummary {
  totalPredictions: number;
  evaluatedWithFeedback: number;
  globalCategoryHits: number;
  globalCategoryAccuracyPct: number | null;
}

export function useClassificationAccuracyMetrics() {
  const [accuracyBySource, setAccuracyBySource] = useState<AccuracyBySourceRow[]>([]);
  const [recentEvaluations, setRecentEvaluations] = useState<PredictionVsFeedbackRow[]>([]);
  const [predictionsPending, setPredictionsPending] = useState<PredictionsPendingRow[]>([]);
  const [summary, setSummary] = useState<ClassificationAccuracySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [bySourceRes, vsRes, countRes, pendingRes] = await Promise.all([
        supabase
          .from("v_classification_accuracy_by_source")
          .select("*")
          .order("report_type", { ascending: true })
          .order("classification_source", { ascending: true }),
        supabase
          .from("v_classification_prediction_vs_feedback")
          .select("*")
          .order("corrected_at", { ascending: false })
          .limit(75),
        supabase
          .from("report_classification_prediction_log")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("v_classification_predictions_pending")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (bySourceRes.error) throw bySourceRes.error;
      if (vsRes.error) throw vsRes.error;
      if (countRes.error) throw countRes.error;
      if (pendingRes.error) throw pendingRes.error;

      const bySource = (bySourceRes.data ?? []) as AccuracyBySourceRow[];
      const vs = (vsRes.data ?? []) as PredictionVsFeedbackRow[];

      const evaluated = bySource.reduce((s, r) => s + (r.evaluated_reports ?? 0), 0);
      const hits = bySource.reduce((s, r) => s + (r.category_hits ?? 0), 0);
      const globalPct = evaluated > 0 ? Math.round((10000 * hits) / evaluated) / 100 : null;

      setAccuracyBySource(bySource);
      setRecentEvaluations(vs);
      setPredictionsPending((pendingRes.data ?? []) as PredictionsPendingRow[]);
      setSummary({
        totalPredictions: countRes.count ?? 0,
        evaluatedWithFeedback: evaluated,
        globalCategoryHits: hits,
        globalCategoryAccuracyPct: globalPct,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar métricas";
      setError(msg);
      setAccuracyBySource([]);
      setRecentEvaluations([]);
      setPredictionsPending([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    accuracyBySource,
    recentEvaluations,
    predictionsPending,
    summary,
    isLoading,
    error,
    refresh: load,
  };
}
