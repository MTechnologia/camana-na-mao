-- =============================================================================
-- Diagnóstico: acesso à RPC get_reports_trend (403 / not authorized)
-- =============================================================================
-- Onde rodar: Supabase Dashboard → SQL Editor (projeto remoto).
--
-- IMPORTANTE: no SQL Editor, auth.uid() costuma ser NULL. Por isso este script
-- usa o UUID explícito abaixo. Troque pelo seu usuário:
--   Auth → Users → copiar UUID
--   ou use o id dos logs: 9a4d17d1-cd9e-41f2-9293-ccee388dc380
-- =============================================================================

-- ↓↓↓ TROQUE O UUID NAS 4 OCORRÊNCIAS ABAIXO ↓↓↓
DO $$
DECLARE
  rec record;
  v_user_id uuid := '9a4d17d1-cd9e-41f2-9293-ccee388dc380';
  v_email text;
  v_has_gestor_admin boolean;
  v_has_view_advanced boolean;
  v_rpc_would_pass boolean;
  v_fn_has_permission_check boolean;
  v_role_count int;
  v_perm_count int;
BEGIN
  RAISE NOTICE '=== 1) Usuário ===';
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN
    RAISE NOTICE 'UUID % NÃO encontrado em auth.users. Confira o id.', v_user_id;
  ELSE
    RAISE NOTICE 'email: %', v_email;
  END IF;

  RAISE NOTICE '=== 2) Papéis em user_roles ===';
  SELECT count(*) INTO v_role_count
  FROM public.user_roles ur
  WHERE ur.user_id = v_user_id;

  IF v_role_count = 0 THEN
    RAISE NOTICE 'PROBLEMA: nenhum papel em user_roles para este usuário.';
  ELSE
    FOR rec IN
      SELECT ur.role::text AS role, ur.created_at
      FROM public.user_roles ur
      WHERE ur.user_id = v_user_id
      ORDER BY ur.role
    LOOP
      RAISE NOTICE '  role: % (desde %)', rec.role, rec.created_at;
    END LOOP;
  END IF;

  RAISE NOTICE '=== 3) Permissões via role_permissions (analytics) ===';
  SELECT count(*) INTO v_perm_count
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role = ur.role
  WHERE ur.user_id = v_user_id
    AND rp.permission_key LIKE 'analytics.%';

  IF v_perm_count = 0 THEN
    RAISE NOTICE 'PROBLEMA: nenhuma permissão analytics.* para os papéis deste usuário.';
    RAISE NOTICE '  Rode a migration HU-11: 20260516120000_hu11_permissions_and_user_lifecycle.sql';
  ELSE
    FOR rec IN
      SELECT rp.role::text AS role, rp.permission_key
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      WHERE ur.user_id = v_user_id
        AND rp.permission_key LIKE 'analytics.%'
      ORDER BY rp.role, rp.permission_key
    LOOP
      RAISE NOTICE '  % → %', rec.role, rec.permission_key;
    END LOOP;
  END IF;

  RAISE NOTICE '=== 4) Funções de autorização ===';

  IF to_regprocedure('public.has_permission(uuid,text)') IS NULL THEN
    RAISE NOTICE 'PROBLEMA: função has_permission(uuid,text) não existe.';
  ELSE
    RAISE NOTICE 'has_permission existe.';
  END IF;

  IF to_regprocedure('public.has_any_role(uuid,app_role[])') IS NULL THEN
    RAISE NOTICE 'PROBLEMA: função has_any_role(uuid,app_role[]) não existe.';
  ELSE
    RAISE NOTICE 'has_any_role existe.';
  END IF;

  v_has_gestor_admin := public.has_any_role(
    v_user_id,
    ARRAY['gestor', 'admin']::public.app_role[]
  );
  v_has_view_advanced := public.has_permission(v_user_id, 'analytics.view_advanced');

  RAISE NOTICE 'has_any_role(gestor|admin): %', v_has_gestor_admin;
  RAISE NOTICE 'has_permission(analytics.view_advanced): %', v_has_view_advanced;

  v_rpc_would_pass := v_has_gestor_admin OR v_has_view_advanced;
  RAISE NOTICE 'RPC get_reports_trend passaria? %', v_rpc_would_pass;

  IF NOT v_rpc_would_pass THEN
    RAISE NOTICE '>>> CAUSA PROVÁVEL DO 403: usuário sem gestor/admin nem analytics.view_advanced no BANCO.';
    RAISE NOTICE '>>> O menu pode liberar pelo catálogo TS, mas a RPC usa user_roles + role_permissions.';
  END IF;

  RAISE NOTICE '=== 5) Overloads de get_reports_with_demographics (PGRST203) ===';
  FOR rec IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_reports_with_demographics'
    ORDER BY args
  LOOP
    RAISE NOTICE '  assinatura: %', rec.args;
  END LOOP;

  RAISE NOTICE '=== 6) Definição atual de get_reports_trend ===';
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_reports_trend'
      AND pg_get_functiondef(p.oid) ILIKE '%has_permission%analytics.view_advanced%'
  ) INTO v_fn_has_permission_check;

  IF NOT v_fn_has_permission_check THEN
    RAISE NOTICE 'PROBLEMA: get_reports_trend NÃO contém checagem has_permission(analytics.view_advanced).';
    RAISE NOTICE '  A migration 20260527140000_analytics_rpc_view_advanced_permission.sql pode não ter sido aplicada neste projeto.';
  ELSE
    RAISE NOTICE 'OK: função get_reports_trend já inclui analytics.view_advanced.';
  END IF;

  RAISE NOTICE '=== 6) auth.uid() nesta sessão (SQL Editor) ===';
  RAISE NOTICE 'auth.uid() = % (NULL aqui é normal; a RPC no app usa o JWT do navegador)', auth.uid();

  RAISE NOTICE '=== Fim do diagnóstico ===';
END $$;

-- -----------------------------------------------------------------------------
-- Resultados em tabela (copie/cole no editor se preferir SELECTs separados)
-- Troque o UUID em todas as linhas abaixo.
-- -----------------------------------------------------------------------------

-- Papéis do usuário
SELECT ur.user_id, ur.role::text AS role, ur.created_at
FROM public.user_roles ur
WHERE ur.user_id = '9a4d17d1-cd9e-41f2-9293-ccee388dc380'::uuid;

-- Permissões analytics herdadas pelos papéis
SELECT ur.role::text AS role, rp.permission_key
FROM public.user_roles ur
JOIN public.role_permissions rp ON rp.role = ur.role
WHERE ur.user_id = '9a4d17d1-cd9e-41f2-9293-ccee388dc380'::uuid
  AND rp.permission_key LIKE 'analytics.%'
ORDER BY 1, 2;

-- Checks booleanos (mesma lógica da RPC após migration 20260527140000)
SELECT
  '9a4d17d1-cd9e-41f2-9293-ccee388dc380'::uuid AS user_id,
  public.has_any_role(
    '9a4d17d1-cd9e-41f2-9293-ccee388dc380'::uuid,
    ARRAY['gestor', 'admin']::public.app_role[]
  ) AS has_gestor_or_admin,
  public.has_permission(
    '9a4d17d1-cd9e-41f2-9293-ccee388dc380'::uuid,
    'analytics.view_advanced'
  ) AS has_analytics_view_advanced,
  (
    public.has_any_role(
      '9a4d17d1-cd9e-41f2-9293-ccee388dc380'::uuid,
      ARRAY['gestor', 'admin']::public.app_role[]
    )
    OR public.has_permission(
      '9a4d17d1-cd9e-41f2-9293-ccee388dc380'::uuid,
      'analytics.view_advanced'
    )
  ) AS rpc_should_allow;

-- Overloads de demografia (deve haver só UMA linha após 20260527150000)
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_reports_with_demographics'
ORDER BY args;

-- Trecho da função (confirma migration aplicada)
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  (pg_get_functiondef(p.oid) ILIKE '%has_permission%analytics.view_advanced%') AS has_new_auth_check
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_reports_trend', 'get_reports_heatmap_data', 'has_permission')
ORDER BY p.proname, args;

-- Contagem global role_permissions (seed HU-11)
SELECT role::text, count(*) AS permissions
FROM public.role_permissions
WHERE permission_key = 'analytics.view_advanced'
GROUP BY role
ORDER BY role;

-- =============================================================================
-- Correções manuais (só se o diagnóstico indicar falta de papel/permissão)
-- =============================================================================
-- Exemplo: conceder papel gestor (ajuste conforme política do projeto):
--
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('9a4d17d1-cd9e-41f2-9293-ccee388dc380'::uuid, 'gestor'::public.app_role)
-- ON CONFLICT DO NOTHING;
--
-- Reaplicar seed de permissões (se role_permissions estiver vazia):
-- → executar o INSERT de role_permissions da migration
--   20260516120000_hu11_permissions_and_user_lifecycle.sql
-- =============================================================================
