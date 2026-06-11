-- RPC de dedup pós-sync: mantém public_services limpa automaticamente depois de cada sync
-- do GeoSampa, sem passo manual. Chamada pelo scripts/sync-geosampa-public-services.mjs
-- (via service_role, como analyze_public_services).
--
-- Por que uma RPC (função) e não CALL das procedures dedup_*_colocated:
--   aquelas procedures usam COMMIT por faixa (bom para a 1ª carga de milhões de linhas),
--   e uma função roda dentro de UMA transação — não pode CALL procedure que faz COMMIT.
--   Aqui replicamos o MESMO critério em statements únicos. Em regime incremental o conjunto
--   ativo (duplicate_of IS NULL) é pequeno (~45k no total), então roda em segundos.
--   `SET statement_timeout` próprio da função evita o timeout curto do role no PostgREST.
--
-- Critério (idêntico às procedures já versionadas):
--   - transit_station: por COORDENADA (~11m), SEM nome (nome = linha de ônibus); canônico
--     preferido = registro com endereço válido.
--   - demais tipos: por COORDENADA (~11m) + NOME normalizado idêntico (unidades distintas
--     co-localizadas — EMEF/EMEI — NÃO fundem).
-- Reversível: grava ids em public_services_dedup_mark_bkp_20260609. Idempotente.

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.run_public_services_dedup()
RETURNS TABLE(svc_type text, marcadas bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
SET statement_timeout = '300s'
AS $fn$
DECLARE
  t text;
  name_types text[] := array[
    'ubs','hospital','school','ceu','library','daycare','park','sports_center',
    'community_center','social_assistance','police_station','fire_station',
    'subprefeitura','market','city_market','street_market','theater','museum','cemetery'
  ];
  n bigint;
BEGIN
  -- Tipos por COORDENADA + NOME idêntico.
  FOREACH t IN ARRAY name_types LOOP
    WITH ranked AS (
      SELECT id,
        first_value(id) OVER w AS canonical_id,
        row_number()    OVER w AS rn
      FROM public_services
      WHERE public_services.service_type = t::service_type AND duplicate_of IS NULL
        AND latitude IS NOT NULL AND longitude IS NOT NULL
      WINDOW w AS (
        PARTITION BY round(latitude, 4), round(longitude, 4),
          lower(btrim(regexp_replace(unaccent(coalesce(name, '')), '\s+', ' ', 'g')))
        ORDER BY total_ratings DESC NULLS LAST, updated_at DESC NULLS LAST, id
      )
    ),
    to_mark AS (SELECT id, canonical_id FROM ranked WHERE rn > 1 AND canonical_id <> id),
    ins AS (
      INSERT INTO public_services_dedup_mark_bkp_20260609 (id, canonical_id, service_type)
      SELECT id, canonical_id, t FROM to_mark
      WHERE NOT EXISTS (SELECT 1 FROM public_services_dedup_mark_bkp_20260609 b WHERE b.id = to_mark.id)
      RETURNING 1
    )
    UPDATE public_services p
    SET duplicate_of = tm.canonical_id, updated_at = now()
    FROM to_mark tm
    WHERE p.id = tm.id AND p.duplicate_of IS NULL;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
      svc_type := t; marcadas := n; RETURN NEXT;
    END IF;
  END LOOP;

  -- transit_station: por COORDENADA, sem nome; canônico com endereço válido.
  WITH ranked AS (
    SELECT id,
      first_value(id) OVER w AS canonical_id,
      row_number()    OVER w AS rn
    FROM public_services
    WHERE public_services.service_type = 'transit_station'::service_type AND duplicate_of IS NULL
      AND latitude IS NOT NULL AND longitude IS NOT NULL
    WINDOW w AS (
      PARTITION BY round(latitude, 4), round(longitude, 4)
      ORDER BY
        (address IS NOT NULL AND btrim(address) <> ''
          AND lower(unaccent(btrim(address))) <> 'endereco nao informado') DESC,
        total_ratings DESC NULLS LAST, updated_at DESC NULLS LAST, id
    )
  ),
  to_mark AS (SELECT id, canonical_id FROM ranked WHERE rn > 1 AND canonical_id <> id),
  ins AS (
    INSERT INTO public_services_dedup_mark_bkp_20260609 (id, canonical_id, service_type)
    SELECT id, canonical_id, 'transit_station' FROM to_mark
    WHERE NOT EXISTS (SELECT 1 FROM public_services_dedup_mark_bkp_20260609 b WHERE b.id = to_mark.id)
    RETURNING 1
  )
  UPDATE public_services p
  SET duplicate_of = tm.canonical_id, updated_at = now()
  FROM to_mark tm
  WHERE p.id = tm.id AND p.duplicate_of IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN
    svc_type := 'transit_station'; marcadas := n; RETURN NEXT;
  END IF;
END;
$fn$;

-- Só service_role (sync) pode executar — não expor a anon/authenticated.
REVOKE ALL ON FUNCTION public.run_public_services_dedup() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_public_services_dedup() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_public_services_dedup() TO service_role;
