-- HU-7.1 — Paridade de exportação: admin, gestor, assessor e vereador.

INSERT INTO public.role_permissions (role, permission_key)
VALUES
  ('assessor', 'exports.create'),
  ('vereador', 'exports.create'),
  ('assessor', 'exports.schedule'),
  ('vereador', 'exports.schedule'),
  ('assessor', 'exports.view_logs'),
  ('vereador', 'exports.view_logs'),
  ('vereador', 'analytics.view_advanced')
ON CONFLICT (role, permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_staff_export_data()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN (
        'admin'::app_role,
        'gestor'::app_role,
        'assessor'::app_role,
        'vereador'::app_role
      )
  );
$$;

COMMENT ON FUNCTION public.can_staff_export_data() IS
  'Staff institucional autorizado a criar exportações (HU-7.1).';

GRANT EXECUTE ON FUNCTION public.can_staff_export_data() TO authenticated;

-- export_jobs
DROP POLICY IF EXISTS "Admin lê próprios export_jobs" ON public.export_jobs;
CREATE POLICY "Staff lê próprios export_jobs"
  ON public.export_jobs FOR SELECT
  USING (auth.uid() = user_id AND public.can_staff_export_data());

DROP POLICY IF EXISTS "Admin cria próprios export_jobs" ON public.export_jobs;
CREATE POLICY "Staff cria próprios export_jobs"
  ON public.export_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.can_staff_export_data());

-- scheduled_exports
DROP POLICY IF EXISTS "Admin lê próprios scheduled_exports" ON public.scheduled_exports;
CREATE POLICY "Staff lê próprios scheduled_exports"
  ON public.scheduled_exports FOR SELECT
  USING (auth.uid() = user_id AND public.can_staff_export_data());

DROP POLICY IF EXISTS "Admin cria próprios scheduled_exports" ON public.scheduled_exports;
CREATE POLICY "Staff cria próprios scheduled_exports"
  ON public.scheduled_exports FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.can_staff_export_data());
