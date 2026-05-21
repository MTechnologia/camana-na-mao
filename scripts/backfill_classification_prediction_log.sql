-- Backfill opcional: cria logs de predição para relatos que existiam antes da feature.
-- Predição = categoria/tipo atual no banco; origem = legacy_backfill (não entra em taxa de acerto até haver correção real).
-- Rode UMA vez em homolog/produção se "Predições registradas" estiver zerado.

INSERT INTO public.report_classification_prediction_log (
  report_id,
  report_type,
  predicted_category,
  predicted_subcategory,
  classification_source,
  user_id
)
SELECT
  u.id,
  'urban',
  COALESCE(NULLIF(TRIM(u.category), ''), 'outro'),
  NULLIF(TRIM(u.subcategory), ''),
  'legacy_backfill',
  u.user_id
FROM public.urban_reports u
WHERE NOT EXISTS (
  SELECT 1 FROM public.report_classification_prediction_log p
  WHERE p.report_id = u.id AND p.report_type = 'urban'
)
ON CONFLICT (report_id, report_type) DO NOTHING;

INSERT INTO public.report_classification_prediction_log (
  report_id,
  report_type,
  predicted_category,
  predicted_subcategory,
  classification_source,
  user_id
)
SELECT
  t.id,
  'transport',
  COALESCE(NULLIF(TRIM(t.report_type), ''), 'outro'),
  NULLIF(TRIM(t.sub_category), ''),
  'legacy_backfill',
  t.user_id
FROM public.transport_reports t
WHERE NOT EXISTS (
  SELECT 1 FROM public.report_classification_prediction_log p
  WHERE p.report_id = t.id AND p.report_type = 'transport'
)
ON CONFLICT (report_id, report_type) DO NOTHING;

SELECT COUNT(*) AS total_prediction_log FROM public.report_classification_prediction_log;
