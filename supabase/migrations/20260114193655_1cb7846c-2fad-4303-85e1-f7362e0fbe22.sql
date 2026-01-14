-- RBAC: close remaining items from user profile matrix (Cidadão / Cidadão Engajado / Gestor / Admin)

-- Helper shortcuts
-- Staff = Gestor or Admin
-- Engaged+ = Cidadão Engajado or Staff

-- 1) Reports (manifestations): Staff can view/manage triage (view all, update status, etc.)
CREATE POLICY "Staff can view all transport reports"
ON public.transport_reports FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]));

CREATE POLICY "Staff can update any transport report"
ON public.transport_reports FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]));

-- Urban reports currently had a broad SELECT policy (USING true). Remove to align with matrix.
DROP POLICY IF EXISTS "Anyone can view reports for nearby functionality" ON public.urban_reports;

CREATE POLICY "Staff can view all urban reports"
ON public.urban_reports FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]));

CREATE POLICY "Staff can update any urban report"
ON public.urban_reports FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]));

-- 2) Respond manifestations: allow Gestor + Admin to manage transport report responses
DROP POLICY IF EXISTS "Admins can manage all responses" ON public.transport_report_responses;

CREATE POLICY "Staff can manage all responses"
ON public.transport_report_responses
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]));

-- 3) Referrals: Gestor + Admin can triage referrals
CREATE POLICY "Staff can view all referrals"
ON public.council_member_referrals FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]));

CREATE POLICY "Staff can update all referrals"
ON public.council_member_referrals FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]));

-- 4) Export: only Staff can create/export logs; Staff can view all export logs (for monitoring)
DROP POLICY IF EXISTS "Users can create export logs" ON public.export_logs;

CREATE POLICY "Staff can create export logs"
ON public.export_logs FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[])
);

CREATE POLICY "Staff can view all export logs"
ON public.export_logs FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]));

-- 5) System settings: only Admin can view/configure
DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;

CREATE POLICY "Admins can view system settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 6) User management already Admin-only in user_roles RLS; keep as-is.
-- 7) Audit logs already Admin-only for full access; keep as-is.