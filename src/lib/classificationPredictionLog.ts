import type { SupabaseClient } from "@supabase/supabase-js";

/** Mesmo valor usado em métricas; formulários manuais (web) não passam pelo ai-orchestrator. */
export const MANUAL_FORM_CLASSIFICATION_SOURCE = "manual_form";

/**
 * Registra predição no momento do envio pelo formulário manual (RLS: user_id = auth.uid()).
 * Falhas são apenas logadas — não bloqueiam o envio do relato.
 */
export async function logManualClassificationPrediction(
  supabase: SupabaseClient,
  params: {
    userId: string;
    reportId: string;
    reportType: "urban" | "transport";
    predictedCategory: string;
    predictedSubcategory: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("report_classification_prediction_log").insert({
    report_id: params.reportId,
    report_type: params.reportType,
    predicted_category: params.predictedCategory,
    predicted_subcategory: params.predictedSubcategory,
    classification_source: MANUAL_FORM_CLASSIFICATION_SOURCE,
    user_id: params.userId,
  });

  if (error && (error as { code?: string }).code === "23505") {
    return;
  }
  if (error) {
    console.warn("[logManualClassificationPrediction]", error.message);
  }
}
