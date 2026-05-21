-- Acurácia da classificação: leitura alinhada a analytics.view_advanced (HU-11), não só admin/gestor.

DROP POLICY IF EXISTS "Admins read classification prediction log" ON public.report_classification_prediction_log;
DROP POLICY IF EXISTS "Admins can view classification feedback" ON public.report_classification_feedback;

CREATE POLICY "Analytics staff read classification prediction log"
  ON public.report_classification_prediction_log FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::public.app_role[])
    OR public.has_permission(auth.uid(), 'analytics.view_advanced')
  );

CREATE POLICY "Analytics staff view classification feedback"
  ON public.report_classification_feedback FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::public.app_role[])
    OR public.has_permission(auth.uid(), 'analytics.view_advanced')
  );

-- INSERT de feedback permanece admin/gestor (gestão de relatos em useReportsAdmin).
