-- Performance: search_public_services_fulltext estourava statement_timeout (57014) com filtro CEU
-- e buscas grandes. Índice (service_type, lat/lng), distância calculada uma vez, texto opcional
-- sem avaliar FTS/ILIKE quando não há query, e timeout maior só nesta função.

SET statement_timeout = 0;

CREATE INDEX IF NOT EXISTS idx_public_services_service_type_lat_lng
  ON public.public_services (service_type, latitude, longitude);

COMMENT ON INDEX idx_public_services_service_type_lat_lng IS
  'Acelera RPC search_public_services_fulltext quando service_types está definido (bbox + tipo).';

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
  -- Só id + dist_m na CTE; o resultado final é ps.* para coincidir com a ordem/tipos de public_services
  -- (lista explícita de colunas quebrou SETOF: col. jsonb vs text conforme ordem física da tabela).
  WITH scored AS (
    SELECT
      ps.id,
      (
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
      )::double precision AS dist_m
    FROM public.public_services ps
    WHERE ps.latitude::double precision >= min_lat
      AND ps.latitude::double precision <= max_lat
      AND ps.longitude::double precision >= min_lng
      AND ps.longitude::double precision <= max_lng
      AND (
        service_types IS NULL
        OR coalesce(cardinality(service_types), 0) = 0
        OR ps.service_type::text = ANY (service_types)
      )
      AND (
        search_query IS NULL
        OR length(trim(search_query)) < 2
        OR ps.search_tsv @@ plainto_tsquery('portuguese', trim(search_query))
        OR (
          length(trim(search_query)) >= 2
          AND (
            lower(ps.name) LIKE '%' || lower(trim(search_query)) || '%'
            OR lower(coalesce(ps.address, '')) LIKE '%' || lower(trim(search_query)) || '%'
            OR lower(coalesce(ps.district, '')) LIKE '%' || lower(trim(search_query)) || '%'
            OR lower(coalesce(ps.services_offered, '')) LIKE '%' || lower(trim(search_query)) || '%'
          )
        )
      )
  )
  SELECT ps.*
  FROM public.public_services ps
  INNER JOIN scored s ON s.id = ps.id
  WHERE s.dist_m <= radius_meters::double precision
  ORDER BY s.dist_m ASC
  LIMIT LEAST(coalesce(result_limit, 800), 5000);
$$;

-- CREATE FUNCTION só aceita um parâmetro por cláusula SET; o timeout da função via ALTER.
ALTER FUNCTION public.search_public_services_fulltext(
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
) SET statement_timeout TO '90s';

COMMENT ON FUNCTION public.search_public_services_fulltext IS
  'Lista public_services no bbox + raio Haversine; FTS/ILIKE opcionais; índice (service_type, lat, lng); timeout 90s na função.';

RESET statement_timeout;
