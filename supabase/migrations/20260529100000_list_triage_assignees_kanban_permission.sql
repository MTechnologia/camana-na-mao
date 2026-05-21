-- Alinha `list_triage_assignees` com HU-11: quem só tem `triage.view_kanban`
-- (ex.: assessor) precisa listar responsáveis para filtros do kanban.
-- Antes só admin/gestor via has_role; isso gerava 400 + P0001 no /admin/triagem.

CREATE OR REPLACE FUNCTION public.list_triage_assignees()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_permission(auth.uid(), 'triage.manage')
    OR public.has_permission(auth.uid(), 'triage.view_kanban')
  ) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN QUERY
  SELECT
    ur.user_id,
    au.email::TEXT,
    COALESCE(p.full_name, au.email)::TEXT AS full_name,
    ur.role::TEXT
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role IN ('admin', 'gestor', 'assessor')
  ORDER BY ur.role, full_name;
END;
$$;

COMMENT ON FUNCTION public.list_triage_assignees() IS
  'Lista usuários elegíveis como responsável na triagem. Exige triage.manage ou triage.view_kanban (HU-11).';
