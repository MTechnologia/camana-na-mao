-- Moderação (UPDATE) de sugestões de correção: apenas administradores.
-- Gestores continuam podendo SELECT (visibilidade operacional).

DROP POLICY IF EXISTS "Staff can moderate service corrections" ON public.service_corrections;

CREATE POLICY "Admins can moderate service corrections"
  ON public.service_corrections
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::public.app_role
    )
  );

COMMENT ON POLICY "Admins can moderate service corrections" ON public.service_corrections IS
  'Apenas role admin pode alterar status / notas de moderação.';
