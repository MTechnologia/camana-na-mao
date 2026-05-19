-- Supabase Security Advisor / linter (câmara na mão):
-- 1) Views de métricas de classificação: usar security_invoker para respeitar RLS do utilizador
--    (evita SECURITY DEFINER implícito em CREATE VIEW sem opção no PG 15+).
-- 2) public.spatial_ref_sys (PostGIS): não deve ser acessível via anon/authenticated pela API;
--    RLS ativo + sem políticas para JWT = negação por omissão; service_role mantém bypass.

-- --- Views de classificação (ordem: base → derivadas) ---
ALTER VIEW IF EXISTS public.v_classification_prediction_vs_feedback
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.v_classification_accuracy_by_source
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.v_classification_predictions_pending
  SET (security_invoker = true);

-- --- PostGIS: tabela de referência SRID (não é dado da aplicação) ---
DO $$
BEGIN
  IF to_regclass('public.spatial_ref_sys') IS NULL THEN
    RAISE NOTICE 'spatial_ref_sys inexistente (PostGIS não instalado em public); skip.';
    RETURN;
  END IF;

  -- Retirar acesso via API (roles do PostgREST)
  BEGIN
    EXECUTE 'REVOKE ALL ON TABLE public.spatial_ref_sys FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE public.spatial_ref_sys FROM authenticated';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Sem permissão para REVOKE em public.spatial_ref_sys; aplicar via botão Resolve issue no Advisor.';
  END;

  -- Manter leitura para funções/serviços internos (PostGIS, Edge com service_role)
  BEGIN
    EXECUTE 'GRANT SELECT ON TABLE public.spatial_ref_sys TO postgres';
    EXECUTE 'GRANT SELECT ON TABLE public.spatial_ref_sys TO service_role';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Sem permissão para GRANT em public.spatial_ref_sys; manter configuração padrão do Supabase.';
  END;

  -- Linter "RLS disabled in public": pode exigir owner interno do PostGIS no projeto.
  BEGIN
    EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Sem permissão para habilitar RLS em public.spatial_ref_sys; resolver manualmente no Security Advisor.';
  END;
END;
$$;
