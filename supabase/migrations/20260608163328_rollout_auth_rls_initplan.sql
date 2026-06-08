-- Rollout do fix auth_rls_initplan em todas as policies do schema public.
-- Substitui chamadas "cruas" auth.uid()/auth.role() por (select auth.<fn>())
-- dentro das expressões USING/WITH CHECK, para que a função seja avaliada
-- uma vez por query (InitPlan) em vez de uma vez por linha.
--
-- Aplicado via bloco DO idempotente que lê as definições reais do catálogo e
-- executa ALTER POLICY (preserva cmd, roles e permissividade). É seguro re-rodar:
-- normaliza formas já-embaladas antes de re-embalar, evitando dupla-embalagem.
-- A tabela public_services já foi tratada na migration anterior.

DO $$
DECLARE r record; stmt text; n int := 0;
BEGIN
  FOR r IN
    SELECT tablename, policyname, qual, with_check,
      regexp_replace(regexp_replace(coalesce(qual,''),
        '\(\s*select\s+(auth\.(uid|role)\(\))(\s+as\s+\w+)?\s*\)','\1','gi'),
        'auth\.(uid|role)\(\)','(select auth.\1())','g') AS wq,
      regexp_replace(regexp_replace(coalesce(with_check,''),
        '\(\s*select\s+(auth\.(uid|role)\(\))(\s+as\s+\w+)?\s*\)','\1','gi'),
        'auth\.(uid|role)\(\)','(select auth.\1())','g') AS wc
    FROM pg_policies
    WHERE schemaname='public'
      AND ( regexp_replace(coalesce(qual,''),      '\(\s*select\s+auth\.(uid|role)\(\)(\s+as\s+\w+)?\s*\)','','gi') ~ 'auth\.(uid|role)\(\)'
         OR regexp_replace(coalesce(with_check,''),'\(\s*select\s+auth\.(uid|role)\(\)(\s+as\s+\w+)?\s*\)','','gi') ~ 'auth\.(uid|role)\(\)' )
  LOOP
    stmt := format('ALTER POLICY %I ON public.%I', r.policyname, r.tablename)
      || CASE WHEN r.qual       IS NOT NULL THEN ' USING ('      ||r.wq||')' ELSE '' END
      || CASE WHEN r.with_check IS NOT NULL THEN ' WITH CHECK (' ||r.wc||')' ELSE '' END;
    EXECUTE stmt;
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'auth_rls_initplan rollout: % policies alteradas', n;
END $$;
