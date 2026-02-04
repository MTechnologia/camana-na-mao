-- RBAC: add new enum value (must be committed before being referenced in policies/functions)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'app_role'
      AND e.enumlabel = 'cidadao_engajado'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'cidadao_engajado';
  END IF;
END $$;

