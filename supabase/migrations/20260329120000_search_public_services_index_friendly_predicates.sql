-- search_public_services_fulltext: predicados compatíveis com o índice
-- (service_type, latitude, longitude).
--
-- Antes: `ps.latitude::double precision >= min_lat` impedia uso do btree em
-- latitude/longitude (cast na coluna). `ps.service_type::text = ANY(...)`
-- impedia uso direto do enum indexado.
-- Agora: comparações com numeric sem cast na coluna; filtro de tipo com
-- `ps.service_type = ANY(service_types::service_type[])`.

SET statement_timeout = 0;

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
    WHERE ps.latitude >= min_lat::numeric
      AND ps.latitude <= max_lat::numeric
      AND ps.longitude >= min_lng::numeric
      AND ps.longitude <= max_lng::numeric
      AND (
        service_types IS NULL
        OR coalesce(cardinality(service_types), 0) = 0
        OR ps.service_type = ANY(service_types::service_type[])
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
  'Lista public_services no bbox + raio Haversine; FTS/ILIKE opcionais; predicados sem cast em lat/lng (índice btree); filtro de tipo via enum; timeout 90s na função.';

RESET statement_timeout;
