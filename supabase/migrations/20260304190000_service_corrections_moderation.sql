-- Moderação de sugestões de correção de cadastro (equipamentos públicos) por admin/gestor.
-- Amplia service_corrections (CSU007) e políticas RLS.

ALTER TABLE public.service_corrections
  ADD COLUMN IF NOT EXISTS staff_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.service_corrections.staff_notes IS 'Observações internas do moderador (recusa, orientação).';
COMMENT ON COLUMN public.service_corrections.reviewed_at IS 'Quando a sugestão foi analisada.';
COMMENT ON COLUMN public.service_corrections.reviewed_by IS 'Usuário staff que analisou.';

-- Normaliza status legados antes do CHECK
UPDATE public.service_corrections
SET status = 'pending'
WHERE status IS NULL
   OR trim(status) = ''
   OR lower(trim(status)) NOT IN ('pending', 'approved', 'rejected', 'applied');

ALTER TABLE public.service_corrections DROP CONSTRAINT IF EXISTS service_corrections_status_check;
ALTER TABLE public.service_corrections
  ADD CONSTRAINT service_corrections_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'applied'));

ALTER TABLE public.service_corrections ALTER COLUMN status SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS service_corrections_status_created_idx
  ON public.service_corrections (status, created_at DESC);

-- Staff enxerga todas as sugestões (política OR com "own rows")
CREATE POLICY "Staff can view all service corrections"
  ON public.service_corrections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'gestor'::public.app_role)
    )
  );

-- Staff atualiza status e campos de moderação (não altera user_id / service_id / texto original)
CREATE POLICY "Staff can moderate service corrections"
  ON public.service_corrections
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'gestor'::public.app_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'gestor'::public.app_role)
    )
  );
