-- Gestão urbana: staff pode criar e editar encaminhamentos a vereador (não só o cidadão dono do relato).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'council_member_referrals'
      AND policyname = 'Staff can insert council referrals'
  ) THEN
    CREATE POLICY "Staff can insert council referrals"
      ON public.council_member_referrals
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.has_any_role(
          auth.uid(),
          ARRAY['admin', 'gestor', 'assessor']::public.app_role[]
        )
        AND auth.uid() = user_id
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'council_member_referrals'
      AND policyname = 'Staff can update council referrals for management'
  ) THEN
    CREATE POLICY "Staff can update council referrals for management"
      ON public.council_member_referrals
      FOR UPDATE
      TO authenticated
      USING (
        public.has_any_role(
          auth.uid(),
          ARRAY['admin', 'gestor', 'assessor']::public.app_role[]
        )
      )
      WITH CHECK (
        public.has_any_role(
          auth.uid(),
          ARRAY['admin', 'gestor', 'assessor']::public.app_role[]
        )
      );
  END IF;
END
$$;

-- Assessor também pode atualizar encaminhamento temático (gestão urbana).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_commission_referrals'
      AND policyname = 'Staff can update commission referrals for management'
  ) THEN
    CREATE POLICY "Staff can update commission referrals for management"
      ON public.report_commission_referrals
      FOR UPDATE
      TO authenticated
      USING (
        public.has_any_role(
          auth.uid(),
          ARRAY['admin', 'gestor', 'assessor']::public.app_role[]
        )
      )
      WITH CHECK (
        public.has_any_role(
          auth.uid(),
          ARRAY['admin', 'gestor', 'assessor']::public.app_role[]
        )
      );
  END IF;
END
$$;
