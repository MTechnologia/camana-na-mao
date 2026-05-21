-- Diagnóstico: Acurácia da classificação (/admin/classification-accuracy)
-- Rode no SQL Editor do Supabase (service_role / postgres vê totais reais).

-- 1) Contagens brutas (ignora RLS se rodar como owner)
SELECT 'prediction_log' AS tabela, COUNT(*)::bigint AS total FROM public.report_classification_prediction_log
UNION ALL
SELECT 'feedback', COUNT(*) FROM public.report_classification_feedback
UNION ALL
SELECT 'vs_feedback (predição+correção)', COUNT(*) FROM public.v_classification_prediction_vs_feedback
UNION ALL
SELECT 'pending (sem correção)', COUNT(*) FROM public.v_classification_predictions_pending;

-- 2) Por origem da predição
SELECT classification_source, report_type, COUNT(*) AS n
FROM public.report_classification_prediction_log
GROUP BY 1, 2
ORDER BY n DESC;

-- 3) Relatos recentes SEM log de predição (candidatos a backfill)
SELECT 'urban_sem_log' AS tipo, COUNT(*)::bigint AS n
FROM public.urban_reports u
WHERE NOT EXISTS (
  SELECT 1 FROM public.report_classification_prediction_log p
  WHERE p.report_id = u.id AND p.report_type = 'urban'
)
UNION ALL
SELECT 'transport_sem_log', COUNT(*)::bigint
FROM public.transport_reports t
WHERE NOT EXISTS (
  SELECT 1 FROM public.report_classification_prediction_log p
  WHERE p.report_id = t.id AND p.report_type = 'transport'
);

-- 4) Troque o UUID para testar RLS como o usuário do app
-- (no SQL Editor auth.uid() é NULL; use a query abaixo com id fixo)
/*
SELECT
  public.has_any_role('9a4d17d1-cd9e-41f2-9293-ccee388dc380'::uuid, ARRAY['admin','gestor']::public.app_role[]) AS is_admin_gestor,
  public.has_permission('9a4d17d1-cd9e-41f2-9293-ccee388dc380'::uuid, 'analytics.view_advanced') AS has_view_advanced;
*/
