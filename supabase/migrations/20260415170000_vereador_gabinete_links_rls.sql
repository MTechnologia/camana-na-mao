-- Gabinete: vínculo entre usuários e vereadores/assessores + acesso RLS aos dados encaminhados.

CREATE TABLE IF NOT EXISTS public.vereador_user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  council_member_id TEXT NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vereador_user_links_role_check CHECK (role IN ('vereador'::public.app_role, 'assessor'::public.app_role)),
  CONSTRAINT vereador_user_links_user_unique UNIQUE (user_id)
);

ALTER TABLE public.vereador_user_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_vereador_user_links_council_member
  ON public.vereador_user_links (council_member_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vereador_user_links_unique_vereador
  ON public.vereador_user_links (council_member_id)
  WHERE role = 'vereador'::public.app_role;

DROP TRIGGER IF EXISTS update_vereador_user_links_updated_at ON public.vereador_user_links;
CREATE TRIGGER update_vereador_user_links_updated_at
BEFORE UPDATE ON public.vereador_user_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Users can view their own gabinete link" ON public.vereador_user_links;
CREATE POLICY "Users can view their own gabinete link"
ON public.vereador_user_links
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can view all gabinete links" ON public.vereador_user_links;
CREATE POLICY "Staff can view all gabinete links"
ON public.vereador_user_links
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::public.app_role[]));

DROP POLICY IF EXISTS "Admins can manage gabinete links" ON public.vereador_user_links;
CREATE POLICY "Admins can manage gabinete links"
ON public.vereador_user_links
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.is_linked_to_council_member(_user_id UUID, _council_member_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vereador_user_links vul
    WHERE vul.user_id = _user_id
      AND vul.council_member_id = _council_member_id
      AND vul.role IN ('vereador'::public.app_role, 'assessor'::public.app_role)
  )
$$;

DROP POLICY IF EXISTS "Linked gabinete can view referrals" ON public.council_member_referrals;
CREATE POLICY "Linked gabinete can view referrals"
ON public.council_member_referrals
FOR SELECT
TO authenticated
USING (public.is_linked_to_council_member(auth.uid(), council_member_id));

DROP POLICY IF EXISTS "Linked gabinete can update referrals" ON public.council_member_referrals;
CREATE POLICY "Linked gabinete can update referrals"
ON public.council_member_referrals
FOR UPDATE
TO authenticated
USING (public.is_linked_to_council_member(auth.uid(), council_member_id))
WITH CHECK (public.is_linked_to_council_member(auth.uid(), council_member_id));

DROP POLICY IF EXISTS "Linked gabinete can view urban reports" ON public.urban_reports;
CREATE POLICY "Linked gabinete can view urban reports"
ON public.urban_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.council_member_referrals cmr
    WHERE cmr.urban_report_id = urban_reports.id
      AND public.is_linked_to_council_member(auth.uid(), cmr.council_member_id)
  )
);

DROP POLICY IF EXISTS "Linked gabinete can view transport reports" ON public.transport_reports;
CREATE POLICY "Linked gabinete can view transport reports"
ON public.transport_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.council_member_referrals cmr
    WHERE cmr.transport_report_id = transport_reports.id
      AND public.is_linked_to_council_member(auth.uid(), cmr.council_member_id)
  )
);

DROP POLICY IF EXISTS "Linked gabinete can view service ratings" ON public.service_ratings;
CREATE POLICY "Linked gabinete can view service ratings"
ON public.service_ratings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.council_member_referrals cmr
    WHERE cmr.service_rating_id = service_ratings.id
      AND public.is_linked_to_council_member(auth.uid(), cmr.council_member_id)
  )
);
