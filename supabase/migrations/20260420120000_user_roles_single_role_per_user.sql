-- RBAC: cada usuário deve possuir um único perfil.

WITH ranked_roles AS (
  SELECT
    id,
    user_id,
    role,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY
        CASE role
          WHEN 'admin'::public.app_role THEN 1
          WHEN 'gestor'::public.app_role THEN 2
          WHEN 'vereador'::public.app_role THEN 3
          WHEN 'assessor'::public.app_role THEN 4
          WHEN 'cidadao_engajado'::public.app_role THEN 5
          WHEN 'cidadao'::public.app_role THEN 6
          ELSE 99
        END,
        created_at ASC,
        id ASC
    ) AS role_rank
  FROM public.user_roles
)
DELETE FROM public.user_roles ur
USING ranked_roles rr
WHERE ur.id = rr.id
  AND rr.role_rank > 1;

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
