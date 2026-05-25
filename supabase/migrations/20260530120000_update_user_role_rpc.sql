-- HU-11 — Atualização atômica de papel + vínculo de gabinete via RPC (SECURITY DEFINER).
-- Corrige falha em que DELETE em user_roles retornava 0 linhas (RLS) e INSERT falhava com 42501.

-- ===========================================================================
-- 1) RLS user_roles — alinhar com has_permission (matriz HU-11)
-- ===========================================================================

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Update role permission can insert"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'users.update_role'));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Update role permission can update"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_permission(auth.uid(), 'users.update_role'))
  WITH CHECK (public.has_permission(auth.uid(), 'users.update_role'));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Update role permission can delete"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_permission(auth.uid(), 'users.update_role'));

-- ===========================================================================
-- 2) RLS vereador_user_links — update_role ou link_gabinete
-- ===========================================================================

DROP POLICY IF EXISTS "Admins can manage gabinete links" ON public.vereador_user_links;
CREATE POLICY "Staff can manage gabinete links"
  ON public.vereador_user_links
  FOR ALL
  TO authenticated
  USING (
    public.has_permission(auth.uid(), 'users.update_role')
    OR public.has_permission(auth.uid(), 'users.link_gabinete')
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'users.update_role')
    OR public.has_permission(auth.uid(), 'users.link_gabinete')
  );

-- ===========================================================================
-- 3) RPC update_user_role
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.update_user_role(
  _target_user_id UUID,
  _role public.app_role,
  _council_member_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _gabinete_role public.app_role;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'users.update_role') THEN
    RAISE EXCEPTION 'permission denied: users.update_role'
      USING ERRCODE = '42501';
  END IF;

  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot change your own role';
  END IF;

  _gabinete_role := CASE
    WHEN _role IN ('vereador'::public.app_role, 'assessor'::public.app_role) THEN _role
    ELSE NULL
  END;

  IF _gabinete_role IS NOT NULL AND COALESCE(btrim(_council_member_id), '') = '' THEN
    RAISE EXCEPTION 'council_member_id required for gabinete roles';
  END IF;

  IF _gabinete_role = 'vereador'::public.app_role THEN
    IF EXISTS (
      SELECT 1
      FROM public.vereador_user_links vul
      WHERE vul.council_member_id = _council_member_id
        AND vul.role = 'vereador'::public.app_role
        AND vul.user_id <> _target_user_id
    ) THEN
      RAISE EXCEPTION 'vereador slot already taken for council member'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, _role);

  IF _gabinete_role IS NOT NULL THEN
    INSERT INTO public.vereador_user_links (user_id, council_member_id, role)
    VALUES (_target_user_id, _council_member_id, _gabinete_role)
    ON CONFLICT (user_id) DO UPDATE
      SET council_member_id = EXCLUDED.council_member_id,
          role = EXCLUDED.role,
          updated_at = now();
  ELSE
    DELETE FROM public.vereador_user_links WHERE user_id = _target_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, public.app_role, TEXT) TO authenticated;

COMMENT ON FUNCTION public.update_user_role IS
  'HU-11: altera papel do usuário e vínculo de gabinete (vereador/assessor). Exige users.update_role.';
