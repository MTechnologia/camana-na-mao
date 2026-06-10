-- Soft-merge (REVERSÍVEL) de duplicados REAIS em public_services via `duplicate_of`.
--
-- Contexto: o ETL do GeoSampa acumula cópias da MESMA unidade com caixa/acentos/espaços
-- diferentes (ex.: "BUTANTA" ×3, "Ceu Emef Paraisopolis" vs "CEU EMEF PARAISOPOLIS"),
-- que apareciam repetidas na busca de serviços do chatbot.
--
-- ⚠️ DESEMPENHO: processa UM service_type por vez (laço). Cada iteração usa o índice de
-- service_type e varre só as linhas daquele tipo — não a tabela inteira (~4,3M). Uma
-- window única com `service_type IN (...21 tipos...)` forçava seq scan de 4,3M linhas e
-- levava 30+ min; por tipo, leva minutos (o maior é `school`, ~628k).
-- Rode via psql/pgAdmin (conexão de sessão, sem timeout HTTP).
--
-- NOTA: o tipo `ceu` (185 linhas) já foi marcado via MCP em 2026-06-09; como só tocamos
-- `duplicate_of IS NULL`, a migration NÃO re-marca o que já está feito (idempotente).
--
-- Critério CONSERVADOR (não funde unidades distintas):
--   mesma service_type + mesma coordenada (~11 m, 4 casas) + nome normalizado IDÊNTICO
--   (unaccent + minúsculo + espaços colapsados). EMEF vs EMEI vs CEI (nomes diferentes)
--   NÃO são fundidos — só cópias do mesmo nome. (O colapso de co-localizados com nomes
--   diferentes é feito na BUSCA do chat, não aqui.)
--
-- NÃO apaga linhas. Idempotente. Reversível via tabela de backup.

SET statement_timeout = 0;

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Backup (só as linhas marcadas) p/ rollback. Tabela interna → RLS ligada (sem políticas
-- = nenhum cliente anon/authenticated lê; a migration roda como service role).
CREATE TABLE IF NOT EXISTS public_services_dedup_mark_bkp_20260609 (
  id uuid NOT NULL,
  canonical_id uuid NOT NULL,
  service_type text,
  marked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public_services_dedup_mark_bkp_20260609 ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS ux_dedup_bkp_20260609_id
  ON public_services_dedup_mark_bkp_20260609 (id);

DO $$
DECLARE
  t text;
  types text[] := array[
    'ubs','hospital','school','ceu','library','daycare','park','sports_center',
    'community_center','social_assistance','police_station','fire_station',
    'subprefeitura','market','city_market','street_market','theater','museum',
    'cemetery','transit_station'
  ];
  n bigint;
BEGIN
  FOREACH t IN ARRAY types LOOP
    WITH ranked AS (
      SELECT id,
        first_value(id) OVER w AS canonical_id,
        row_number() OVER w AS rn
      FROM public_services
      WHERE service_type = t AND duplicate_of IS NULL
        AND latitude IS NOT NULL AND longitude IS NOT NULL
      WINDOW w AS (
        PARTITION BY round(latitude, 4), round(longitude, 4),
          lower(btrim(regexp_replace(unaccent(coalesce(name, '')), '\s+', ' ', 'g')))
        ORDER BY total_ratings DESC NULLS LAST, updated_at DESC NULLS LAST, id
      )
    ),
    to_mark AS (
      SELECT id, canonical_id FROM ranked WHERE rn > 1 AND canonical_id <> id
    ),
    ins AS (
      INSERT INTO public_services_dedup_mark_bkp_20260609 (id, canonical_id, service_type)
      SELECT id, canonical_id, t FROM to_mark
      WHERE NOT EXISTS (
        SELECT 1 FROM public_services_dedup_mark_bkp_20260609 b WHERE b.id = to_mark.id
      )
    )
    UPDATE public_services p
    SET duplicate_of = tm.canonical_id, updated_at = now()
    FROM to_mark tm
    WHERE p.id = tm.id AND p.duplicate_of IS NULL;

    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE '% : % linhas marcadas', t, n;
  END LOOP;
END $$;

-- VERIFICAÇÃO:
--   SELECT service_type, count(*) FROM public_services_dedup_mark_bkp_20260609 GROUP BY 1 ORDER BY 2 DESC;
--
-- ROLLBACK (reversível):
--   UPDATE public_services p SET duplicate_of = NULL
--   FROM public_services_dedup_mark_bkp_20260609 b
--   WHERE p.id = b.id AND p.duplicate_of = b.canonical_id;
--   -- depois de validado: DROP TABLE IF EXISTS public_services_dedup_mark_bkp_20260609;
