-- Full-text search em public_services: coluna tsvector gerada + índice GIN + RPC para "Perto de você".

-- Backfill da coluna gerada + CREATE INDEX GIN podem exceder o statement_timeout padrão.
SET statement_timeout = 0;

-- Coluna gerada (atualiza automaticamente em INSERT/UPDATE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'public_services'
      AND column_name = 'search_tsv'
  ) THEN
    ALTER TABLE public.public_services
      ADD COLUMN search_tsv tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('portuguese', coalesce(name, '')), 'A')
        || setweight(to_tsvector('portuguese', coalesce(address, '')), 'B')
        || setweight(to_tsvector('portuguese', coalesce(district, '')), 'B')
        || setweight(to_tsvector('portuguese', coalesce(city, '')), 'C')
        || setweight(to_tsvector('portuguese', coalesce(state, '')), 'C')
        || setweight(to_tsvector('portuguese', coalesce(zip_code, '')), 'D')
        || setweight(to_tsvector('portuguese', coalesce(services_offered, '')), 'D')
        || setweight(to_tsvector('portuguese', coalesce(capacity_info, '')), 'D')
      ) STORED;
  END IF;
END
$$;

COMMENT ON COLUMN public.public_services.search_tsv IS
  'Índice full-text (português): nome, endereço, bairro, cidade, CEP, serviços oferecidos, capacidade.';

CREATE INDEX IF NOT EXISTS idx_public_services_search_tsv
  ON public.public_services
  USING GIN (search_tsv);

-- Busca no retângulo + raio (Haversine) + opcionalmente FTS (search_query com 2+ caracteres).
CREATE OR REPLACE FUNCTION public.search_public_services_fulltext(
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  center_lat double precision,
  center_lng double precision,
  radius_meters double precision,
  search_query text,
  service_types text[] DEFAULT NULL,
  result_limit integer DEFAULT 800
)
RETURNS SETOF public.public_services
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT ps.*
  FROM public.public_services ps
  WHERE ps.latitude::double precision >= min_lat
    AND ps.latitude::double precision <= max_lat
    AND ps.longitude::double precision >= min_lng
    AND ps.longitude::double precision <= max_lng
    AND (
      6371000 * acos(
        LEAST(
          1.0::double precision,
          GREATEST(
            -1.0::double precision,
            cos(radians(center_lat)) * cos(radians(ps.latitude::double precision)) *
            cos(radians(ps.longitude::double precision) - radians(center_lng)) +
            sin(radians(center_lat)) * sin(radians(ps.latitude::double precision))
          )
        )
      )
    )::double precision <= radius_meters::double precision
    AND (
      search_query IS NULL
      OR length(trim(search_query)) < 2
      OR ps.search_tsv @@ plainto_tsquery('portuguese', trim(search_query))
    )
    AND (
      service_types IS NULL
      OR coalesce(cardinality(service_types), 0) = 0
      OR ps.service_type::text = ANY (service_types)
    )
  ORDER BY (
    6371000 * acos(
      LEAST(
        1.0::double precision,
        GREATEST(
          -1.0::double precision,
          cos(radians(center_lat)) * cos(radians(ps.latitude::double precision)) *
          cos(radians(ps.longitude::double precision) - radians(center_lng)) +
          sin(radians(center_lat)) * sin(radians(ps.latitude::double precision))
        )
      )
    )
  )::double precision ASC
  LIMIT LEAST(coalesce(result_limit, 800), 5000);
$$;

COMMENT ON FUNCTION public.search_public_services_fulltext IS
  'Lista public_services no bbox + raio (m); se search_query tem 2+ caracteres, filtra com full-text (search_tsv).';

GRANT EXECUTE ON FUNCTION public.search_public_services_fulltext(
  double precision,
  double precision,
  double precision,
  double precision,
  double precision,
  double precision,
  double precision,
  text,
  text[],
  integer
) TO anon, authenticated;

RESET statement_timeout;
