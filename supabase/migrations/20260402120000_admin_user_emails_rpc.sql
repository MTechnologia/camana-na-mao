-- E-mails de auth.users para a tela Gestão de Usuários (apenas role admin).
CREATE OR REPLACE FUNCTION public.admin_user_emails()
RETURNS TABLE (user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, COALESCE(u.email, '')::text
  FROM auth.users u
  WHERE EXISTS (
    SELECT 1
    WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
  );
$$;

COMMENT ON FUNCTION public.admin_user_emails() IS
  'Lista id e e-mail de usuários em auth.users; só retorna linhas se o chamador for admin.';

GRANT EXECUTE ON FUNCTION public.admin_user_emails() TO authenticated;
