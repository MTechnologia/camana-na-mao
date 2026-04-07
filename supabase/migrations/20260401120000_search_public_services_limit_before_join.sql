-- 57014 statement_timeout em produção: "todos os tipos" + bbox grande gerava JOIN enorme
-- antes do LIMIT. Filtra por distância, ordena e LIMIT só com (id, dist_m); depois busca ps.*.

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
  result_limit integer DEFAULT 800,
  min_radius_meters double precision DEFAULT NULL
)
RETURNS SETOF public.public_services
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH ranked AS (
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
  ),
  limited AS (
    SELECT r.id, r.dist_m
    FROM ranked r
    WHERE r.dist_m <= radius_meters::double precision
      AND (
        min_radius_meters IS NULL
        OR min_radius_meters <= 0::double precision
        OR r.dist_m >= min_radius_meters::double precision
      )
    ORDER BY r.dist_m ASC
    LIMIT LEAST(coalesce(result_limit, 800), 5000)
  )
  SELECT ps.*
  FROM limited l
  INNER JOIN public.public_services ps ON ps.id = l.id
  ORDER BY l.dist_m ASC;
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
  integer,
  double precision
) SET statement_timeout TO '3min';

COMMENT ON FUNCTION public.search_public_services_fulltext IS
  'Lista public_services no bbox + raio Haversine; min_radius opcional; LIMIT antes do JOIN em ps.*; timeout 3min.';

RESET statement_timeout;
