-- Add RLS policies for admins and gestors to view all profiles
-- This enables user management in the admin CMS

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Allow gestors to view all profiles
CREATE POLICY "Gestors can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'gestor'));

-- Also ensure admins can view all user_roles for the management page
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Allow gestors to view all user_roles
CREATE POLICY "Gestors can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'gestor'));