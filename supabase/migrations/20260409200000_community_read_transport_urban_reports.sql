-- Leitura colaborativa: cidadãos autenticados podem ver relatos alheios para contexto,
-- apoiar e abrir detalhes (mesmo padrão esperado pelo histórico urbano e pelo chat de similares).
-- Complementa as políticas "próprio relato" e "staff vê tudo" (RLS permissive = OR entre políticas).

DROP POLICY IF EXISTS "Authenticated users can view urban reports for community features" ON public.urban_reports;
DROP POLICY IF EXISTS "Authenticated users can view transport reports for community features" ON public.transport_reports;

CREATE POLICY "Authenticated users can view urban reports for community features"
ON public.urban_reports
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view transport reports for community features"
ON public.transport_reports
FOR SELECT
TO authenticated
USING (true);
