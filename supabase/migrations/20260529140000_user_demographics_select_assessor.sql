-- Assessores participam da triagem / gestão de relatos e precisam ver demografia
-- do autor no drill (ReportDetailSheet), como admin e gestor.

DROP POLICY IF EXISTS "Staff can view all user demographics" ON public.user_demographics;

CREATE POLICY "Staff can view all user demographics"
  ON public.user_demographics FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(
      auth.uid(),
      ARRAY['gestor', 'admin', 'assessor']::public.app_role[]
    )
  );

COMMENT ON POLICY "Staff can view all user demographics" ON public.user_demographics IS
  'HU-11: staff operacional (admin, gestor, assessor) lê demografia de qualquer usuário para drill de relatos e painéis.';
