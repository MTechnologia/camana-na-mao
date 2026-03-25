-- Recalcula average_rating e total_ratings em public_services com base em avaliações
-- publication_status IN ('published', 'pending_review') (alinhado ao trigger update_service_rating).
--
-- Pré-requisito: migration 20260321130000_service_ratings_auto_moderation.sql aplicada
-- (coluna service_ratings.publication_status existe).
--
-- Uso com psql (recomendado; evita timeout do SQL Editor do Supabase):
--
-- 1) Pegue a URI em: Supabase Dashboard → Project Settings → Database →
--    Connection string → URI. Use modo "Session" ou conexão direta (porta 5432),
--    não "Transaction", para consultas longas.
--
-- 2) Bash / Git Bash / WSL:
--   export DATABASE_URL='postgresql://postgres.[ref]:[SENHA]@db.[ref].supabase.co:5432/postgres'
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/recalculate-public-services-rating-aggregates.sql
--
-- 3) PowerShell (Windows), a partir da raiz do repositório:
--   $env:DATABASE_URL = 'postgresql://postgres.[ref]:[SENHA]@db.[ref].supabase.co:5432/postgres'
--   psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f .\scripts\sql\recalculate-public-services-rating-aggregates.sql
--
-- Se não tiver psql: instale "PostgreSQL" (inclui cliente) ou só as ferramentas de linha
-- de comando em https://www.postgresql.org/download/windows/
--
-- Nota: operações do dia a dia já mantêm agregados via trigger update_service_rating;
-- este script alinha histórico após introduzir publication_status ou após correções.

SET statement_timeout = 0;

UPDATE public.public_services ps
SET
  average_rating = COALESCE(s.avg_stars, 0),
  total_ratings = s.cnt
FROM (
  SELECT
    sr.service_id,
    AVG(sr.rating_stars)::numeric AS avg_stars,
    COUNT(*)::integer AS cnt
  FROM public.service_ratings sr
  WHERE sr.publication_status IN ('published', 'pending_review')
  GROUP BY sr.service_id
) s
WHERE ps.id = s.service_id;

UPDATE public.public_services ps
SET average_rating = 0,
  total_ratings = 0
WHERE NOT EXISTS (
  SELECT 1
  FROM public.service_ratings sr
  WHERE sr.service_id = ps.id
    AND sr.publication_status IN ('published', 'pending_review')
);
