-- HU-11.2 — Edição da matriz role × permission pela interface admin.

INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('admin', 'users.manage_permissions')
ON CONFLICT (role, permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_role_permissions_matrix(
  p_assignments JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row JSONB;
  v_role public.app_role;
  v_key TEXT;
  v_admin_required TEXT[] := ARRAY[
    'users.read',
    'users.invite',
    'users.update_role',
    'users.suspend',
    'users.delete',
    'users.link_gabinete',
    'users.manage_permissions',
    'system.configure',
    'system.view_audit_logs',
    'system.moderate_services'
  ];
  v_allowed_keys TEXT[] := ARRAY[
    'users.read', 'users.invite', 'users.update_role', 'users.suspend',
    'users.delete', 'users.link_gabinete', 'users.manage_permissions',
    'reports.read', 'reports.update_status', 'reports.add_note', 'reports.mark_duplicate',
    'triage.manage', 'triage.view_kanban', 'triage.refer_commission', 'triage.respond_commission',
    'exports.create', 'exports.schedule', 'exports.view_logs',
    'analytics.view_advanced', 'analytics.view_forecast', 'analytics.view_anomalies', 'analytics.view_patterns',
    'gabinete.view', 'gabinete.respond_referrals',
    'system.configure', 'system.view_audit_logs', 'system.moderate_services'
  ];
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.has_permission(v_uid, 'users.manage_permissions') THEN
    RAISE EXCEPTION 'permission denied: users.manage_permissions';
  END IF;

  IF p_assignments IS NULL OR jsonb_typeof(p_assignments) <> 'array' THEN
    RAISE EXCEPTION 'assignments must be a json array';
  END IF;

  TRUNCATE public.role_permissions;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_assignments)
  LOOP
    v_role := (v_row->>'role')::public.app_role;
    v_key := NULLIF(TRIM(v_row->>'permission_key'), '');

    IF v_key IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT (v_key = ANY (v_allowed_keys)) THEN
      RAISE EXCEPTION 'invalid permission_key: %', v_key;
    END IF;

    INSERT INTO public.role_permissions (role, permission_key)
    VALUES (v_role, v_key)
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOREACH v_key IN ARRAY v_admin_required
  LOOP
    INSERT INTO public.role_permissions (role, permission_key)
    VALUES ('admin'::public.app_role, v_key)
    ON CONFLICT DO NOTHING;
  END LOOP;

  SELECT COUNT(*)::INT INTO v_count FROM public.role_permissions;

  RETURN jsonb_build_object('ok', true, 'count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_role_permissions_matrix(JSONB) TO authenticated;

COMMENT ON FUNCTION public.sync_role_permissions_matrix IS
  'HU-11.2: substitui role_permissions a partir da matriz editada no admin. Exige users.manage_permissions.';
