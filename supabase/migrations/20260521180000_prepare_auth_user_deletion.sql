-- Desbloqueia exclusão de usuários em auth.users (Dashboard e auth.admin.deleteUser).
-- Causas comuns de 500:
--   1) FKs sem ON DELETE (HU-9/10/11)
--   2) audit_logs imutável com ON DELETE CASCADE (tenta DELETE e o trigger bloqueia)

-- ===========================================================================
-- 1) FKs: SET NULL ou CASCADE onde faltava
-- ===========================================================================

ALTER TABLE public.report_triage
  DROP CONSTRAINT IF EXISTS report_triage_triaged_by_fkey,
  ADD CONSTRAINT report_triage_triaged_by_fkey
    FOREIGN KEY (triaged_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.report_anomalies
  DROP CONSTRAINT IF EXISTS report_anomalies_acknowledged_by_fkey,
  ADD CONSTRAINT report_anomalies_acknowledged_by_fkey
    FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_suspended_by_fkey,
  ADD CONSTRAINT profiles_suspended_by_fkey
    FOREIGN KEY (suspended_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.report_commission_referrals
  DROP CONSTRAINT IF EXISTS report_commission_referrals_responded_by_fkey,
  ADD CONSTRAINT report_commission_referrals_responded_by_fkey
    FOREIGN KEY (responded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- referred_by é NOT NULL: remove encaminhamentos do usuário (não dá para SET NULL).
ALTER TABLE public.report_commission_referrals
  DROP CONSTRAINT IF EXISTS report_commission_referrals_referred_by_fkey,
  ADD CONSTRAINT report_commission_referrals_referred_by_fkey
    FOREIGN KEY (referred_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- audit_logs: anonimizar em vez de apagar (preserva trilha HU-12)
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey,
  ADD CONSTRAINT audit_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ===========================================================================
-- 2) audit_logs imutável: permitir UPDATE só de user_id → NULL (FK ON DELETE SET NULL)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.audit_logs_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_bypass TEXT;
BEGIN
  v_bypass := current_setting('audit_logs.bypass_immutability', true);
  IF v_bypass = 'true' THEN
    RETURN COALESCE(OLD, NEW);
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS NULL
       AND OLD.user_id IS NOT NULL
       AND to_jsonb(OLD) - 'user_id' = to_jsonb(NEW) - 'user_id' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'audit_logs is immutable: UPDATE not allowed';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'audit_logs is immutable: DELETE not allowed';
  END IF;
  RETURN NULL;
END;
$$;

-- ===========================================================================
-- 3) RPC usada pelo Dashboard (SQL), delete-user e scripts de suporte
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.prepare_auth_user_deletion(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_id é obrigatório';
  END IF;

  UPDATE public.report_triage
    SET triaged_by = NULL,
        assignee_id = NULL
    WHERE triaged_by = _user_id OR assignee_id = _user_id;

  UPDATE public.report_anomalies
    SET acknowledged_by = NULL
    WHERE acknowledged_by = _user_id;

  UPDATE public.profiles
    SET suspended_by = NULL
    WHERE suspended_by = _user_id;

  UPDATE public.report_commission_referrals
    SET responded_by = NULL
    WHERE responded_by = _user_id;

  DELETE FROM public.report_commission_referrals
    WHERE referred_by = _user_id;

  DELETE FROM public.vereador_user_links
    WHERE user_id = _user_id;

  DELETE FROM public.user_roles
    WHERE user_id = _user_id;

  PERFORM set_config('audit_logs.bypass_immutability', 'true', true);
  UPDATE public.audit_logs
    SET user_id = NULL
    WHERE user_id = _user_id;
END;
$$;

COMMENT ON FUNCTION public.prepare_auth_user_deletion IS
  'Remove/desanexa referências em public que impedem DELETE em auth.users. Chamar antes de auth.admin.deleteUser.';

REVOKE ALL ON FUNCTION public.prepare_auth_user_deletion(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_auth_user_deletion(UUID) TO service_role;
