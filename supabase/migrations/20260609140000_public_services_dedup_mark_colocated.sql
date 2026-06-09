-- Soft-merge (REVERSÍVEL) de duplicados REAIS em public_services via `duplicate_of`.
--
-- Contexto: o ETL do GeoSampa acumula cópias da MESMA unidade com caixa/acentos/espaços
-- diferentes (ex.: "CEU EMEF PARAISOPOLIS" vs "Ceu Emef Paraisopolis"), que apareciam
-- repetidas na busca de serviços do chatbot.
--
-- ⚠️ ESCALA: public_services tem ~4,3M linhas. Por isso:
--   - restringimos aos service_type pesquisáveis (subconjunto ~634k);
--   - o backup guarda APENAS as linhas que mudam (não copia a tabela toda);
--   - SET statement_timeout = 0 (operação administrativa).
-- Recomendado rodar via psql/CLI (`supabase db push` ou conexão direta), NÃO pelo
-- SQL Editor — o editor tem timeout HTTP curto e pode devolver "Failed to fetch"
-- mesmo com a query ainda rodando no servidor.
--
-- Critério CONSERVADOR (não funde unidades distintas):
--   mesma service_type
--   + mesma coordenada arredondada a 4 casas (~11 m)
--   + nome normalizado IDÊNTICO (unaccent + minúsculo + espaços colapsados)
-- EMEF vs EMEI vs CEI (nomes diferentes) NÃO são fundidos — só cópias do mesmo nome.
--
-- NÃO apaga linhas. Idempotente (só toca duplicate_of NULL). Reversível via backup.

SET statement_timeout = 0;

CREATE EXTENSION IF NOT EXISTS unaccent;

BEGIN;

-- Evita corrida com o sync do GeoSampa enquanto marcamos os duplicados.
SELECT pg_advisory_xact_lock(hashtext('public_services_dedup_mark_colocated'));

-- Backup SÓ das linhas que serão marcadas (id + duplicate_of antigo = NULL),
-- já com o canônico calculado. Leve e suficiente para o rollback.
CREATE TABLE IF NOT EXISTS public_services_dedup_mark_bkp_20260609 AS
WITH ranked AS (
  SELECT
    id,
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
)
SELECT id, canonical_id
FROM ranked
WHERE rn > 1 AND canonical_id <> id;

-- Marca os duplicados (aponta para o canônico). Só linhas ainda NULL (idempotente).
UPDATE public_services p
SET duplicate_of = b.canonical_id,
    updated_at = now()
FROM public_services_dedup_mark_bkp_20260609 b
WHERE p.id = b.id
  AND p.duplicate_of IS NULL;

COMMIT;

-- PREVIEW (opcional, rodar antes em staging): nº de linhas que serão marcadas =
--   SELECT count(*) FROM public_services_dedup_mark_bkp_20260609;
--
-- ROLLBACK (reversível) — desfaz ESTA marcação:
--   UPDATE public_services p SET duplicate_of = NULL
--   FROM public_services_dedup_mark_bkp_20260609 b
--   WHERE p.id = b.id AND p.duplicate_of = b.canonical_id;
-- Depois de validado, remova o backup:
--   DROP TABLE IF EXISTS public_services_dedup_mark_bkp_20260609;
