-- HU-12 — Auditoria imutável, cobertura automática via triggers e retenção 12 meses.
--
-- Conteúdo:
--   1. Trigger BEFORE UPDATE/DELETE em audit_logs (bloqueia alteração)
--   2. Função genérica `audit_log_changes()` reutilizável em qualquer tabela
--   3. Triggers AFTER INSERT/UPDATE/DELETE em tabelas-chave:
--      - user_roles
--      - report_triage
--      - report_commission_referrals
--      - report_anomalies
--      - profiles (apenas suspended_at — não logar todo update de profile)
--   4. Tabela audit_logs_archive (mesmo schema, sem triggers)
--   5. RPC purge_old_audit_logs() que move > 12 meses para o archive
--
-- A imutabilidade é forçada no PG: nem service_role consegue UPDATE/DELETE
-- diretamente. A função de retenção usa SET LOCAL para bypassar via flag.

-- ===========================================================================
-- 1) Imutabilidade
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.audit_logs_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_bypass TEXT;
BEGIN
  -- Permite bypass quando a transação setou explicitamente a flag.
  -- Apenas a função purge_old_audit_logs faz isso.
  v_bypass := current_setting('audit_logs.bypass_immutability', true);
  IF v_bypass = 'true' THEN
    RETURN COALESCE(OLD, NEW);
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'audit_logs is immutable: UPDATE not allowed';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'audit_logs is immutable: DELETE not allowed';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable_update ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_logs_immutable();

DROP TRIGGER IF EXISTS trg_audit_logs_immutable_delete ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_logs_immutable();

COMMENT ON FUNCTION public.audit_logs_immutable IS
  'HU-12.3: bloqueia UPDATE/DELETE em audit_logs. Bypass via SET LOCAL audit_logs.bypass_immutability = ''true''.';

-- ===========================================================================
-- 2) Função genérica de captura de mudanças
-- ===========================================================================
--
-- Uso: `EXECUTE FUNCTION public.audit_log_changes('action_label')`. O label
-- vira o `action` no registro. Ex: 'role_changed', 'triage_updated', etc.
-- O entity_type vem do TG_TABLE_NAME automaticamente.

CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_entity_id UUID;
  v_actor UUID;
  v_old JSONB;
  v_new JSONB;
BEGIN
  -- Argumento do trigger define o "action" (label legível).
  v_action := TG_ARGV[0];
  IF v_action IS NULL THEN
    v_action := lower(TG_OP) || '_' || TG_TABLE_NAME;
  END IF;

  -- Tenta derivar entity_id (assume coluna `id` UUID). Fallback NULL.
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_entity_id := (to_jsonb(OLD)->>'id')::uuid;
      v_old := to_jsonb(OLD);
      v_new := NULL;
    ELSIF TG_OP = 'INSERT' THEN
      v_entity_id := (to_jsonb(NEW)->>'id')::uuid;
      v_old := NULL;
      v_new := to_jsonb(NEW);
    ELSE
      v_entity_id := (to_jsonb(NEW)->>'id')::uuid;
      v_old := to_jsonb(OLD);
      v_new := to_jsonb(NEW);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_entity_id := NULL;
  END;

  v_actor := auth.uid();

  INSERT INTO public.audit_logs (
    user_id, action, entity_type, entity_id, old_values, new_values, metadata
  ) VALUES (
    v_actor,
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    v_old,
    v_new,
    jsonb_build_object('op', TG_OP)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.audit_log_changes IS
  'HU-12.1: trigger genérico que registra alterações em audit_logs. Usar como AFTER INSERT/UPDATE/DELETE com action label no TG_ARGV[0].';

-- ===========================================================================
-- 3) Triggers em tabelas-chave
-- ===========================================================================

-- user_roles (papéis dos usuários)
DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_changes('role_changed');

-- report_triage (triagem de relatos)
DROP TRIGGER IF EXISTS trg_audit_report_triage ON public.report_triage;
CREATE TRIGGER trg_audit_report_triage
  AFTER INSERT OR UPDATE OR DELETE ON public.report_triage
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_changes('triage_changed');

-- report_commission_referrals (encaminhamentos)
DROP TRIGGER IF EXISTS trg_audit_commission_referrals ON public.report_commission_referrals;
CREATE TRIGGER trg_audit_commission_referrals
  AFTER INSERT OR UPDATE OR DELETE ON public.report_commission_referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_changes('commission_referral_changed');

-- report_anomalies (detecção de anomalias)
DROP TRIGGER IF EXISTS trg_audit_report_anomalies ON public.report_anomalies;
CREATE TRIGGER trg_audit_report_anomalies
  AFTER INSERT OR UPDATE OR DELETE ON public.report_anomalies
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_changes('anomaly_changed');

-- profiles — apenas quando suspended_at muda (não pra todo update).
-- Trigger condicional via WHEN clause.
DROP TRIGGER IF EXISTS trg_audit_profile_suspension ON public.profiles;
CREATE TRIGGER trg_audit_profile_suspension
  AFTER UPDATE OF suspended_at ON public.profiles
  FOR EACH ROW
  WHEN (OLD.suspended_at IS DISTINCT FROM NEW.suspended_at)
  EXECUTE FUNCTION public.audit_log_changes('user_suspension_changed');

-- ===========================================================================
-- 4) audit_logs_archive
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs_archive (
  id UUID PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs_archive IS
  'HU-12.4: arquivo histórico de audit_logs (> 12 meses). Preserva o histórico além da janela ativa.';

CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_created_at
  ON public.audit_logs_archive(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_user_id
  ON public.audit_logs_archive(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_entity
  ON public.audit_logs_archive(entity_type, entity_id);

ALTER TABLE public.audit_logs_archive ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs_archive'
      AND policyname = 'Admin can view audit_logs_archive'
  ) THEN
    CREATE POLICY "Admin can view audit_logs_archive"
      ON public.audit_logs_archive FOR SELECT
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END
$$;

-- ===========================================================================
-- 5) purge_old_audit_logs() — move > 12 meses para archive
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.purge_old_audit_logs(
  _retention_months INTEGER DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_moved INTEGER;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    -- Permite também invocação pelo service_role (sem auth.uid). Se auth.uid
    -- existe e não é admin, rejeita.
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'permission denied';
    END IF;
  END IF;

  v_cutoff := now() - make_interval(months => _retention_months);

  -- Copia para o archive os registros antigos.
  INSERT INTO public.audit_logs_archive (
    id, user_id, action, entity_type, entity_id,
    old_values, new_values, ip_address, user_agent, metadata, created_at
  )
  SELECT
    id, user_id, action, entity_type, entity_id,
    old_values, new_values, ip_address, user_agent, metadata, created_at
  FROM public.audit_logs
  WHERE created_at < v_cutoff
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_moved = ROW_COUNT;

  -- Habilita bypass de imutabilidade só para esta transação.
  PERFORM set_config('audit_logs.bypass_immutability', 'true', true);

  DELETE FROM public.audit_logs
  WHERE created_at < v_cutoff;

  RETURN jsonb_build_object(
    'status', 'success',
    'cutoff', v_cutoff,
    'archived_rows', v_moved
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_old_audit_logs(INTEGER) TO authenticated;

COMMENT ON FUNCTION public.purge_old_audit_logs IS
  'HU-12.4: move audit_logs > N meses para audit_logs_archive. Default 12 meses.';

-- ===========================================================================
-- 6) Helper RPC: lista de usuários que já apareceram no audit_logs
--    (usado para popular o filtro de "Usuário" no UI)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.list_audit_log_actors()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  log_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN QUERY
  SELECT
    al.user_id,
    COALESCE(p.full_name, au.email)::TEXT AS full_name,
    au.email::TEXT,
    COUNT(*)::BIGINT AS log_count
  FROM public.audit_logs al
  LEFT JOIN auth.users au ON au.id = al.user_id
  LEFT JOIN public.profiles p ON p.id = al.user_id
  WHERE al.user_id IS NOT NULL
  GROUP BY al.user_id, p.full_name, au.email
  ORDER BY log_count DESC
  LIMIT 200;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_audit_log_actors() TO authenticated;
