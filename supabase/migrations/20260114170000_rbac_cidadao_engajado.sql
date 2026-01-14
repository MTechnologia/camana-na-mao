-- RBAC: add "cidadao_engajado" role and align policies with user profile matrix

-- NOTE: the enum value is added in a separate migration file to avoid
-- "unsafe use of new value of enum" when referencing it in policies.

-- 1) Helper: check if user has ANY of the provided roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- 2) Ensure default role is assigned on signup (cidadao)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  -- Default RBAC role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cidadao'::public.app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill: ensure existing users have at least one role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'cidadao'::public.app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
)
ON CONFLICT DO NOTHING;

-- 3) Dashboards: viewing public dashboards and creating dashboards require engaged+ (cidadao_engajado/gestor/admin)
DROP POLICY IF EXISTS "Anyone can view public approved dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Users can create dashboards" ON public.dashboards;

CREATE POLICY "Engaged users can view public approved dashboards"
ON public.dashboards FOR SELECT
TO authenticated
USING (
  is_public = true
  AND is_approved = true
  AND public.has_any_role(auth.uid(), ARRAY['cidadao_engajado', 'gestor', 'admin']::public.app_role[])
);

CREATE POLICY "Engaged users can create dashboards"
ON public.dashboards FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.has_any_role(auth.uid(), ARRAY['cidadao_engajado', 'gestor', 'admin']::public.app_role[])
);

-- 4) Council member referrals: only engaged+ can create referrals (encaminhar para vereador)
DROP POLICY IF EXISTS "Users can create their own referrals" ON public.council_member_referrals;

CREATE POLICY "Engaged users can create their own referrals"
ON public.council_member_referrals FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.has_any_role(auth.uid(), ARRAY['cidadao_engajado', 'gestor', 'admin']::public.app_role[])
);

