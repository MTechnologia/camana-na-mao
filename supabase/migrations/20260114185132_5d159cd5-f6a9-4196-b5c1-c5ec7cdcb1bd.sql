-- Migration 2: RBAC cidadao_engajado - functions, backfill, and policies

-- 1. Create helper function has_any_role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  );
$$;

-- 2. Update handle_new_user to also assign cidadao role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  
  -- Assign default cidadao role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cidadao')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 3. Backfill: Ensure all existing users have at least cidadao role
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'cidadao'::public.app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Update dashboards policies for cidadao_engajado+

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Users can create dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Users can update their own dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Users can delete their own dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Public dashboards are viewable by engaged citizens" ON public.dashboards;

-- Recreate with cidadao_engajado+ requirement
CREATE POLICY "Users can view their own dashboards"
ON public.dashboards FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'gestor', 'vereador', 'assessor', 'cidadao_engajado']::public.app_role[])
);

CREATE POLICY "Public dashboards are viewable by engaged citizens"
ON public.dashboards FOR SELECT
TO authenticated
USING (
  is_public = true 
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'gestor', 'vereador', 'assessor', 'cidadao_engajado']::public.app_role[])
);

CREATE POLICY "Users can create dashboards"
ON public.dashboards FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'gestor', 'vereador', 'assessor', 'cidadao_engajado']::public.app_role[])
);

CREATE POLICY "Users can update their own dashboards"
ON public.dashboards FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'gestor', 'vereador', 'assessor', 'cidadao_engajado']::public.app_role[])
);

CREATE POLICY "Users can delete their own dashboards"
ON public.dashboards FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() 
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'gestor', 'vereador', 'assessor', 'cidadao_engajado']::public.app_role[])
);

-- 5. Update council_member_referrals policies for cidadao_engajado+

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.council_member_referrals;
DROP POLICY IF EXISTS "Users can create referrals" ON public.council_member_referrals;
DROP POLICY IF EXISTS "Users can update their own referrals" ON public.council_member_referrals;

-- Recreate with cidadao_engajado+ requirement
CREATE POLICY "Users can view their own referrals"
ON public.council_member_referrals FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.has_any_role(auth.uid(), ARRAY['admin', 'gestor', 'vereador', 'assessor']::public.app_role[])
);

CREATE POLICY "Engaged citizens can create referrals"
ON public.council_member_referrals FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'gestor', 'vereador', 'assessor', 'cidadao_engajado']::public.app_role[])
);

CREATE POLICY "Users can update their own referrals"
ON public.council_member_referrals FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::public.app_role[])
);