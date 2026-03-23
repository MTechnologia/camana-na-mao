-- Métricas de acurácia da classificação (sem dashboard): predição no registro + comparação com correções humanas (report_classification_feedback).

CREATE TABLE IF NOT EXISTS public.report_classification_prediction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  report_id UUID NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('urban', 'transport')),
  predicted_category TEXT NOT NULL,
  predicted_subcategory TEXT,
  classification_source TEXT NOT NULL,
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT report_classification_prediction_log_report_unique UNIQUE (report_id, report_type)
);

COMMENT ON TABLE public.report_classification_prediction_log IS 'Predição de categoria/tipo no momento do registro (chat); usada para medir acurácia vs correções em report_classification_feedback';
COMMENT ON COLUMN public.report_classification_prediction_log.classification_source IS 'Origem da predição: feedback_loop, urgent_pattern, auto_heuristic, fallback_outro, user_recovery, fuzzy_text, keyword_extract, manual_form (formulário web), unknown';

CREATE INDEX IF NOT EXISTS idx_report_classification_prediction_log_created
  ON public.report_classification_prediction_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_classification_prediction_log_source
  ON public.report_classification_prediction_log (classification_source);
CREATE INDEX IF NOT EXISTS idx_report_classification_prediction_log_type
  ON public.report_classification_prediction_log (report_type);

ALTER TABLE public.report_classification_prediction_log ENABLE ROW LEVEL SECURITY;

-- Idempotente: reexecução no SQL Editor / repair não falha com 42710
DROP POLICY IF EXISTS "Users insert own classification prediction log" ON public.report_classification_prediction_log;
DROP POLICY IF EXISTS "Admins read classification prediction log" ON public.report_classification_prediction_log;

-- Cidadão só insere a própria linha (Edge chama create com JWT do usuário)
CREATE POLICY "Users insert own classification prediction log"
  ON public.report_classification_prediction_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Gestão consulta agregados (sem UI no app; SQL Editor / BI)
CREATE POLICY "Admins read classification prediction log"
  ON public.report_classification_prediction_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'gestor')
    )
  );

-- Última correção por relato + predição (só relatos que já tiveram feedback)
CREATE OR REPLACE VIEW public.v_classification_prediction_vs_feedback AS
SELECT DISTINCT ON (p.report_id, p.report_type)
  p.id AS prediction_log_id,
  p.created_at AS predicted_at,
  p.report_id,
  p.report_type,
  p.predicted_category,
  p.predicted_subcategory,
  p.classification_source,
  f.id AS feedback_id,
  f.created_at AS corrected_at,
  f.source AS correction_source,
  f.original_category,
  f.original_subcategory,
  f.corrected_category,
  f.corrected_subcategory,
  (p.predicted_category IS NOT DISTINCT FROM f.corrected_category) AS category_match,
  (p.predicted_subcategory IS NOT DISTINCT FROM f.corrected_subcategory) AS subcategory_match
FROM public.report_classification_prediction_log p
INNER JOIN public.report_classification_feedback f
  ON f.report_id = p.report_id
 AND f.report_type = p.report_type
ORDER BY p.report_id, p.report_type, f.created_at DESC;

COMMENT ON VIEW public.v_classification_prediction_vs_feedback IS 'Join predição (registro) × última correção; category_match = acerto de categoria após validação humana';

-- Agregação por fonte da predição (acertos/erros de categoria após correção)
CREATE OR REPLACE VIEW public.v_classification_accuracy_by_source AS
SELECT
  report_type,
  classification_source,
  COUNT(*) AS evaluated_reports,
  COUNT(*) FILTER (WHERE category_match) AS category_hits,
  COUNT(*) FILTER (WHERE NOT category_match) AS category_misses,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE category_match) / NULLIF(COUNT(*), 0),
    2
  ) AS category_accuracy_pct
FROM public.v_classification_prediction_vs_feedback
GROUP BY report_type, classification_source
ORDER BY report_type, classification_source;

COMMENT ON VIEW public.v_classification_accuracy_by_source IS 'Taxa de acerto da categoria predita vs categoria corrigida (último feedback), por origem da predição';
