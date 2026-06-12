-- Regra de negócio: encaminhar relatos a vereadores é ação de TRIAGEM (staff).
--
-- Remove as policies de INSERT que permitiam o cidadão criar encaminhamentos via API
-- (mesmo sem a UI, já restringida em useUserRole.canReferToCouncilMember = admin/gestor):
--   * council_member_referrals_insert_own  — roles {public}, só checava auth.uid() = user_id
--     (qualquer autenticado conseguia inserir).
--   * "Engaged users can create their own referrals" — permitia o cidadão engajado.
--
-- Após esta migração, o INSERT em council_member_referrals fica coberto apenas pelas
-- policies de staff:
--   * "Staff can insert council referrals" (admin/gestor/assessor + auth.uid() = user_id)
--   * "admins_manage_council_referrals"   (ALL: admin/gestor/vereador/assessor)
-- Cidadãos (cidadao, cidadao_engajado) deixam de conseguir encaminhar.
--
-- SELECT/UPDATE/DELETE permanecem inalterados (o cidadão ainda visualiza os próprios
-- encaminhamentos via council_member_referrals_select_own).

DROP POLICY IF EXISTS "council_member_referrals_insert_own" ON public.council_member_referrals;
DROP POLICY IF EXISTS "Engaged users can create their own referrals" ON public.council_member_referrals;
