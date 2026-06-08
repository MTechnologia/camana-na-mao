-- Otimização de RLS em public_services (~4,3M linhas).
-- Resolve advisors: multiple_permissive_policies (3 policies de SELECT sobrepostas)
-- e auth_rls_initplan (auth.uid() reavaliado por linha na policy ALL).

-- 1) Consolida o SELECT público numa única policy (remove a duplicada)
DROP POLICY IF EXISTS "Anyone can view public services" ON public.public_services;
-- mantém: public_services_select_all  (SELECT, USING true)

-- 2) Substitui a policy ALL por policies só de escrita, com auth.uid() avaliado
--    uma vez por query via subquery (select auth.uid()).
DROP POLICY IF EXISTS admins_manage_public_services ON public.public_services;

CREATE POLICY admins_insert_public_services ON public.public_services
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role((select auth.uid()), ARRAY['admin'::app_role,'gestor'::app_role]));

CREATE POLICY admins_update_public_services ON public.public_services
  FOR UPDATE TO authenticated
  USING      (has_any_role((select auth.uid()), ARRAY['admin'::app_role,'gestor'::app_role]))
  WITH CHECK (has_any_role((select auth.uid()), ARRAY['admin'::app_role,'gestor'::app_role]));

CREATE POLICY admins_delete_public_services ON public.public_services
  FOR DELETE TO authenticated
  USING (has_any_role((select auth.uid()), ARRAY['admin'::app_role,'gestor'::app_role]));
