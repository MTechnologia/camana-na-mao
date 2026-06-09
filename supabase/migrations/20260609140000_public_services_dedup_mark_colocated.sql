-- Soft-merge (REVERSÍVEL) de duplicados REAIS em public_services via `duplicate_of`.
--
-- Contexto: o ETL do GeoSampa acumula cópias da MESMA unidade com caixa/acentos/espaços
-- diferentes (ex.: "BUTANTA" ×3, "Ceu Emef Paraisopolis" vs "CEU EMEF PARAISOPOLIS"),
-- que apareciam repetidas na busca de serviços do chatbot.
--
-- ⚠️ ESCALA: o tipo `school` sozinho tem ~628k linhas. Varreduras pesadas NÃO passam no
-- SQL Editor nem no MCP (timeout HTTP curto → "Failed to fetch", e a query continua presa
-- no servidor). RODE ESTA MIGRATION VIA psql/CLI (sem timeout):
--   psql "<DB_URL_session>" -f supabase/migrations/20260609140000_public_services_dedup_mark_colocated.sql
--
-- NOTA: o tipo `ceu` (185 linhas) já foi marcado manualmente via MCP em 2026-06-09; como
-- a migration só toca `duplicate_of IS NULL`, ela NÃO re-marca o que já está feito (idempotente).
--
-- Critério CONSERVADOR (não funde unidades distintas):
--   mesma service_type
--   + mesma coordenada arredondada a 4 casas (~11 m)
--   + nome normalizado IDÊNTICO (unaccent + minúsculo + espaços colapsados)
-- EMEF vs EMEI vs CEI (nomes diferentes) NÃO são fundidos — só cópias do mesmo nome.
-- (O colapso de unidades co-localizadas com nomes diferentes é feito na BUSCA do chat.)
--
-- NÃO apaga linhas. Idempotente. Reversível via tabela de backup.

SET statement_timeout = 0;

CREATE EXTENSION IF NOT EXISTS unaccent;

BEGIN;

-- Evita corrida com o sync do GeoSampa enquanto marcamos os duplicados.
SELECT pg_advisory_xact_lock(hashtext('public_services_dedup_mark_colocated'));

-- Backup (só as linhas marcadas) para rollback. Tabela interna → RLS ligada (sem
-- políticas = nenhum cliente anon/authenticated lê; a migration roda como service role).
CREATE TABLE IF NOT EXISTS public_services_dedup_mark_bkp_20260609 (
  id uuid NOT NULL,
  canonical_id uuid NOT NULL,
  service_type text,
  marked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public_services_dedup_mark_bkp_20260609 ENABLE ROW LEVEL SECURITY;

WITH ranked AS (
  SELECT
    id,
    service_type,
    first_value(id) OVER w AS canonical_id,
    row_number() OVER w AS rn
  FROM public_services
  WHERE duplicate_of IS NULL
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
    AND service_type IN (
      'ubs','hospital','school','ceu','library','daycare','park','sports_center',
      'community_center','social_assistance','police_station','fire_station',
      'subprefeitura','market','city_market','street_market','theater','museum',
      'cemetery','transit_station'
    )
  WINDOW w AS (
    PARTITION BY service_type, round(latitude, 4), round(longitude, 4),
      lower(btrim(regexp_replace(unaccent(coalesce(name, '')), '\s+', ' ', 'g')))
    ORDER BY total_ratings DESC NULLS LAST, updated_at DESC NULLS LAST, id
  )
),
to_mark AS (
  SELECT id, canonical_id, service_type
  FROM ranked
  WHERE rn > 1 AND canonical_id <> id
),
ins AS (
  INSERT INTO public_services_dedup_mark_bkp_20260609 (id, canonical_id, service_type)
  SELECT tm.id, tm.canonical_id, tm.service_type
  FROM to_mark tm
  WHERE NOT EXISTS (
    SELECT 1 FROM public_services_dedup_mark_bkp_20260609 b WHERE b.id = tm.id
  )
  RETURNING 1
)
UPDATE public_services p
SET duplicate_of = tm.canonical_id,
    updated_at = now()
FROM to_mark tm
WHERE p.id = tm.id
  AND p.duplicate_of IS NULL;

COMMIT;

-- VERIFICAÇÃO pós-execução:
--   SELECT service_type, count(*) FROM public_services_dedup_mark_bkp_20260609 GROUP BY 1 ORDER BY 2 DESC;
--
-- ROLLBACK (reversível) — desfaz ESTA marcação:
--   UPDATE public_services p SET duplicate_of = NULL
--   FROM public_services_dedup_mark_bkp_20260609 b
--   WHERE p.id = b.id AND p.duplicate_of = b.canonical_id;
-- Depois de validado, remova o backup:
--   DROP TABLE IF EXISTS public_services_dedup_mark_bkp_20260609;
