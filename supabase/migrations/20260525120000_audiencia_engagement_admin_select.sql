-- NREF admin gestão audiências: gestor/admin podem consultar inscrições e participações no painel.

DROP POLICY IF EXISTS "Admin gestor can view all audiencia inscricoes" ON public.audiencia_inscricoes;
CREATE POLICY "Admin gestor can view all audiencia inscricoes"
  ON public.audiencia_inscricoes FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
  );

DROP POLICY IF EXISTS "Admin gestor can view all audiencia participacoes" ON public.audiencia_participacoes;
CREATE POLICY "Admin gestor can view all audiencia participacoes"
  ON public.audiencia_participacoes FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
  );
