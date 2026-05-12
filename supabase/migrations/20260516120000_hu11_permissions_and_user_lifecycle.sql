-- HU-11 — Catálogo de permissões + ciclo de vida do usuário.
--
-- Conteúdo:
--   1. Tabela `role_permissions` (seed do catálogo TS de src/lib/permissions.ts).
--   2. Função `has_permission(uid, key)` para uso em RLS.
--   3. Coluna `suspended_at` em profiles + RPCs suspend_user / reactivate_user.
--   4. RPC `invite_user_role` para atribuir role após convite (helper interno).
--
-- A tabela role_permissions é READ-ONLY pelo cliente (RLS bloqueia writes
-- não-service-role). O conteúdo é gerenciado via migrations — fonte da verdade
-- continua sendo o catálogo TS.

-- ===========================================================================
-- 1) role_permissions
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role app_role NOT NULL,
  permission_key TEXT NOT NULL,
  PRIMARY KEY (role, permission_key)
);

COMMENT ON TABLE public.role_permissions IS
  'HU-11.2: matriz role × permission. Seedada do catálogo TS em src/lib/permissions.ts.';

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Leitura para qualquer authenticated (precisa pra renderizar a matriz).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'role_permissions'
      AND policyname = 'Authenticated can view role_permissions'
  ) THEN
    CREATE POLICY "Authenticated can view role_permissions"
      ON public.role_permissions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

-- Não criamos policy de INSERT/UPDATE/DELETE: apenas service_role escreve
-- (e isso só acontece via migration).

-- Seed do catálogo. Limpa primeiro e reinsere para garantir alinhamento.
TRUNCATE public.role_permissions;

INSERT INTO public.role_permissions (role, permission_key) VALUES
  -- users
  ('admin', 'users.read'),
  ('admin', 'users.invite'),
  ('admin', 'users.update_role'),
  ('admin', 'users.suspend'),
  ('admin', 'users.delete'),
  ('admin', 'users.link_gabinete'),
  -- reports
  ('admin', 'reports.read'),
  ('gestor', 'reports.read'),
  ('vereador', 'reports.read'),
  ('assessor', 'reports.read'),
  ('cidadao_engajado', 'reports.read'),
  ('admin', 'reports.update_status'),
  ('gestor', 'reports.update_status'),
  ('admin', 'reports.add_note'),
  ('gestor', 'reports.add_note'),
  ('vereador', 'reports.add_note'),
  ('assessor', 'reports.add_note'),
  ('admin', 'reports.mark_duplicate'),
  ('gestor', 'reports.mark_duplicate'),
  -- triage
  ('admin', 'triage.manage'),
  ('gestor', 'triage.manage'),
  ('admin', 'triage.view_kanban'),
  ('gestor', 'triage.view_kanban'),
  ('assessor', 'triage.view_kanban'),
  ('admin', 'triage.refer_commission'),
  ('gestor', 'triage.refer_commission'),
  ('assessor', 'triage.refer_commission'),
  ('admin', 'triage.respond_commission'),
  ('gestor', 'triage.respond_commission'),
  -- exports
  ('admin', 'exports.create'),
  ('gestor', 'exports.create'),
  ('admin', 'exports.schedule'),
  ('gestor', 'exports.schedule'),
  ('admin', 'exports.view_logs'),
  ('gestor', 'exports.view_logs'),
  -- analytics
  ('admin', 'analytics.view_advanced'),
  ('gestor', 'analytics.view_advanced'),
  ('assessor', 'analytics.view_advanced'),
  ('admin', 'analytics.view_forecast'),
  ('gestor', 'analytics.view_forecast'),
  ('admin', 'analytics.view_anomalies'),
  ('gestor', 'analytics.view_anomalies'),
  ('admin', 'analytics.view_patterns'),
  ('gestor', 'analytics.view_patterns'),
  -- gabinete
  ('vereador', 'gabinete.view'),
  ('assessor', 'gabinete.view'),
  ('vereador', 'gabinete.respond_referrals'),
  ('assessor', 'gabinete.respond_referrals'),
  -- system
  ('admin', 'system.configure'),
  ('admin', 'system.view_audit_logs'),
  ('admin', 'system.moderate_services');

CREATE INDEX IF NOT EXISTS idx_role_permissions_perm
  ON public.role_permissions(permission_key);

-- ===========================================================================
-- 2) has_permission(uid, key)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission_key = _permission_key
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.has_permission IS
  'HU-11.3: checa se um usuário tem uma permissão via role_permissions.';

-- ===========================================================================
-- 3) profiles.suspended_at + suspend/reactivate
-- ===========================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

COMMENT ON COLUMN public.profiles.suspended_at IS
  'HU-11.1: quando definido, indica que a conta está suspensa (login bloqueado).';

CREATE INDEX IF NOT EXISTS idx_profiles_suspended_at
  ON public.profiles(suspended_at) WHERE suspended_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.suspend_user(
  _target_id UUID,
  _reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_permission(auth.uid(), 'users.suspend') THEN
    RAISE EXCEPTION 'permission denied: users.suspend';
  END IF;

  IF _target_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot suspend yourself';
  END IF;

  UPDATE public.profiles
  SET suspended_at = now(),
      suspended_by = auth.uid(),
      suspended_reason = _reason
  WHERE id = _target_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reactivate_user(
  _target_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_permission(auth.uid(), 'users.suspend') THEN
    RAISE EXCEPTION 'permission denied: users.suspend';
  END IF;

  UPDATE public.profiles
  SET suspended_at = NULL,
      suspended_by = NULL,
      suspended_reason = NULL
  WHERE id = _target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.suspend_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_user(UUID) TO authenticated;

-- ===========================================================================
-- 4) invite_user_role — helper chamado pela edge function invite-user
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.invite_user_role(
  _new_user_id UUID,
  _role app_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas admin pode atribuir role via convite.
  IF NOT has_permission(auth.uid(), 'users.invite') THEN
    RAISE EXCEPTION 'permission denied: users.invite';
  END IF;

  -- Limpa role anterior (em tese não tem, mas garante consistência).
  DELETE FROM public.user_roles WHERE user_id = _new_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_new_user_id, _role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_user_role(UUID, app_role) TO authenticated;

-- ===========================================================================
-- 5) Index de apoio
-- ===========================================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles(user_id);
