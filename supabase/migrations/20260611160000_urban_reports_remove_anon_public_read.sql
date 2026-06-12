-- Segurança/LGPD: remove a leitura ANÔNIMA de relatos urbanos.
--
-- A policy "urban_reports_select_public" estava com roles = {public} (o que inclui
-- o role `anon`) e USING (status <> 'rejected'), permitindo que QUALQUER pessoa
-- deslogada lesse qualquer relato urbano (descrição, endereço, fotos) direto pela
-- API/URL pública (PostgREST com a anon key). Os relatos de transporte já não
-- tinham essa exposição (não há policy anon em transport_reports).
--
-- Após esta migração, ler `urban_reports` passa a exigir login (role authenticated).
-- Continuam valendo:
--   * "Users can view their own reports"            (dono: auth.uid() = user_id)
--   * "Authenticated users can view urban reports for community features" (feed)
--   * "Staff can view all urban reports" / "Linked gabinete can view urban reports"
-- Ou seja: o feed comunitário e o "Ver meu relato" seguem funcionando para
-- usuários autenticados; apenas o acesso anônimo (sem login) é fechado.
--
-- Nota: as fotos ainda estão em bucket público (urban-reports) — tratado em fase
-- separada junto ao alinhamento de moderação/visibilidade com o cliente.

DROP POLICY IF EXISTS "urban_reports_select_public" ON public.urban_reports;
