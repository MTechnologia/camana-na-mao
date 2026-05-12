-- HU-11.3 — Refatora RLS de tabelas chave para usar has_permission.
--
-- Esta migration demonstra o padrão substituindo has_role hardcoded por
-- has_permission em 4 tabelas representativas:
--
--   - report_triage (criada na HU-10)
--   - report_anomalies (criada na HU-9.3)
--   - report_commission_referrals (criada na HU-10)
--   - profiles (suspended_at — só admin com users.suspend pode alterar)
--
-- Quando uma nova permissão for adicionada em src/lib/permissions.ts e
-- seedada em role_permissions, novas tabelas podem adotar o mesmo padrão
-- via migrations subsequentes. Para a HU-11 manter o escopo razoável,
-- focamos nas tabelas críticas das HUs 9-10. O restante do app continua
-- usando has_role hardcoded — funcionalmente equivalente, já que o catálogo
-- TS está sincronizado com a tabela role_permissions.

-- ===========================================================================
-- 1) report_triage
-- ===========================================================================

DROP POLICY IF EXISTS "Admin and gestor can insert triage" ON public.report_triage;
CREATE POLICY "Triage manage can insert"
  ON public.report_triage
  FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'triage.manage'));

DROP POLICY IF EXISTS "Admin and gestor can update triage" ON public.report_triage;
CREATE POLICY "Triage manage can update"
  ON public.report_triage
  FOR UPDATE
  USING (has_permission(auth.uid(), 'triage.manage'))
  WITH CHECK (has_permission(auth.uid(), 'triage.manage'));

DROP POLICY IF EXISTS "Staff can view triage" ON public.report_triage;
CREATE POLICY "View kanban can read triage"
  ON public.report_triage
  FOR SELECT
  USING (has_permission(auth.uid(), 'triage.view_kanban'));

-- ===========================================================================
-- 2) report_anomalies
-- ===========================================================================

DROP POLICY IF EXISTS "Admin and gestor can view anomalies" ON public.report_anomalies;
CREATE POLICY "View anomalies can read"
  ON public.report_anomalies
  FOR SELECT
  USING (has_permission(auth.uid(), 'analytics.view_anomalies'));

DROP POLICY IF EXISTS "Admin and gestor can update anomalies" ON public.report_anomalies;
CREATE POLICY "View anomalies can update"
  ON public.report_anomalies
  FOR UPDATE
  USING (has_permission(auth.uid(), 'analytics.view_anomalies'))
  WITH CHECK (has_permission(auth.uid(), 'analytics.view_anomalies'));

DROP POLICY IF EXISTS "Admin can insert anomalies" ON public.report_anomalies;
CREATE POLICY "View anomalies can insert"
  ON public.report_anomalies
  FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'analytics.view_anomalies'));

-- ===========================================================================
-- 3) report_commission_referrals
-- ===========================================================================

DROP POLICY IF EXISTS "Staff can insert commission referrals" ON public.report_commission_referrals;
CREATE POLICY "Refer commission can insert"
  ON public.report_commission_referrals
  FOR INSERT
  WITH CHECK (
    has_permission(auth.uid(), 'triage.refer_commission')
    AND referred_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admin and gestor can update commission referrals" ON public.report_commission_referrals;
CREATE POLICY "Respond commission can update"
  ON public.report_commission_referrals
  FOR UPDATE
  USING (has_permission(auth.uid(), 'triage.respond_commission'))
  WITH CHECK (has_permission(auth.uid(), 'triage.respond_commission'));

-- ===========================================================================
-- 4) profiles — suspensão
-- ===========================================================================

-- O update geral em profiles continua sob a política existente (cada usuário
-- atualiza seu próprio profile). A suspensão só pode ser feita via RPC
-- suspend_user / reactivate_user, que checam has_permission internamente
-- (definidas na migration 20260516120000). Não precisa policy extra aqui.

COMMENT ON FUNCTION public.has_permission IS
  'HU-11.3: helper de RBAC usado por RLS para checar permissões granulares.';
