-- Permitir exclusão de usuário em auth.users: FKs que bloqueavam passam a
-- CASCADE (apagar dados do usuário) ou SET NULL (apagar apenas a referência).
-- Resolve "Database error deleting user" ao chamar auth.admin.deleteUser().

-- 1) Limpar órfãos: registros cujo user_id não existe mais em auth.users
--    (evita erro ao adicionar a nova FK que exige referência válida)
DELETE FROM public.urban_reports
  WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.service_corrections
  WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.service_plans
  WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.service_alerts
  WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.transport_reports
  WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.report_referrals
  WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.transport_subscriptions
  WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);

UPDATE public.dynamic_categories SET approved_by = NULL
  WHERE approved_by IS NOT NULL AND approved_by NOT IN (SELECT id FROM auth.users);
UPDATE public.category_usage_log SET user_id = NULL
  WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);
UPDATE public.system_settings SET updated_by = NULL
  WHERE updated_by IS NOT NULL AND updated_by NOT IN (SELECT id FROM auth.users);

-- 2) Alterar FKs para ON DELETE CASCADE ou SET NULL
-- urban_reports, service_corrections, service_plans, service_alerts (20251126060229)
ALTER TABLE public.urban_reports
  DROP CONSTRAINT IF EXISTS urban_reports_user_id_fkey,
  ADD CONSTRAINT urban_reports_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.service_corrections
  DROP CONSTRAINT IF EXISTS service_corrections_user_id_fkey,
  ADD CONSTRAINT service_corrections_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.service_plans
  DROP CONSTRAINT IF EXISTS service_plans_user_id_fkey,
  ADD CONSTRAINT service_plans_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.service_alerts
  DROP CONSTRAINT IF EXISTS service_alerts_user_id_fkey,
  ADD CONSTRAINT service_alerts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- transport_reports, report_referrals, transport_subscriptions (20251126052342)
ALTER TABLE public.transport_reports
  DROP CONSTRAINT IF EXISTS transport_reports_user_id_fkey,
  ADD CONSTRAINT transport_reports_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.report_referrals
  DROP CONSTRAINT IF EXISTS report_referrals_user_id_fkey,
  ADD CONSTRAINT report_referrals_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.transport_subscriptions
  DROP CONSTRAINT IF EXISTS transport_subscriptions_user_id_fkey,
  ADD CONSTRAINT transport_subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- approved_by e user_id opcionais: SET NULL para não apagar o registro (20260112130425)
ALTER TABLE public.dynamic_categories
  DROP CONSTRAINT IF EXISTS dynamic_categories_approved_by_fkey,
  ADD CONSTRAINT dynamic_categories_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.category_usage_log
  DROP CONSTRAINT IF EXISTS category_usage_log_user_id_fkey,
  ADD CONSTRAINT category_usage_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- system_settings.updated_by: SET NULL (20251127041225)
ALTER TABLE public.system_settings
  DROP CONSTRAINT IF EXISTS system_settings_updated_by_fkey,
  ADD CONSTRAINT system_settings_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
