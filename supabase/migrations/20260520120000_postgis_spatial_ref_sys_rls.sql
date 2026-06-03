-- PostGIS — Habilita RLS na tabela spatial_ref_sys para silenciar o aviso
-- "RLS Disabled in Public" do Supabase Security Advisor.
--
-- Contexto:
--   spatial_ref_sys é uma tabela criada automaticamente pela extensão
--   PostGIS. Contém ~8000 linhas de sistemas de referência espacial
--   padronizados (WGS84, SRID 4326, etc) que são públicos por natureza
--   e iguais em qualquer instalação PostGIS do mundo. PostGIS precisa
--   ler essa tabela para todas as operações espaciais.
--
-- Estratégia:
--   Habilita RLS + policy permissiva de SELECT. INSERT/UPDATE/DELETE
--   ficam bloqueados para usuários comuns (que já não tinham permissão
--   mesmo sem RLS, porque a tabela é OWNED pelo supabase_admin).
--
-- Se este script falhar com permission denied, é porque o projeto
-- Supabase não permite ALTER nessa tabela do PostGIS — neste caso,
-- ignore o alerta no Advisor manualmente ou abra ticket no support.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'spatial_ref_sys'
  ) THEN
    BEGIN
      ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'spatial_ref_sys'
          AND policyname = 'Anyone can read spatial_ref_sys'
      ) THEN
        CREATE POLICY "Anyone can read spatial_ref_sys"
          ON public.spatial_ref_sys
          FOR SELECT
          USING (true);
      END IF;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping spatial_ref_sys RLS: insufficient privilege (PostGIS system table, owned by supabase_admin).';
      WHEN OTHERS THEN
        RAISE NOTICE 'Skipping spatial_ref_sys RLS: %', SQLERRM;
    END;
  END IF;
END
$$;
