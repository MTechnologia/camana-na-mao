-- Predições que ainda não têm correção (admin precisa abrir o relato e alterar categoria para alimentar métricas).

CREATE OR REPLACE VIEW public.v_classification_predictions_pending AS
SELECT
  p.report_id,
  p.report_type,
  p.predicted_category,
  p.predicted_subcategory,
  p.classification_source,
  p.created_at,
  COALESCE(u.protocol_code, t.protocol_code) AS protocol_code
FROM public.report_classification_prediction_log p
LEFT JOIN public.urban_reports u ON u.id = p.report_id AND p.report_type = 'urban'
LEFT JOIN public.transport_reports t ON t.id = p.report_id AND p.report_type = 'transport'
WHERE NOT EXISTS (
  SELECT 1 FROM public.report_classification_feedback f
  WHERE f.report_id = p.report_id AND f.report_type = p.report_type
);

COMMENT ON VIEW public.v_classification_predictions_pending IS 'Predições ainda sem correção; use protocolo para localizar em Relatos e alterar categoria/tipo';
