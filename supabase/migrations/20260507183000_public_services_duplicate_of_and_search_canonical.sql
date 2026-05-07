-- Soft-dedupe: coluna duplicate_of + buscas RPC só retornam canônicos (duplicate_of IS NULL).

SET statement_timeout = 0;

ALTER TABLE public.public_services
  ADD COLUMN IF NOT EXISTS duplicate_of uuid REFERENCES public.public_services (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_public_services_duplicate_of
  ON public.public_services (duplicate_of)
  WHERE duplicate_of IS NOT NULL;

COMMENT ON COLUMN public.public_services.duplicate_of IS
  'Aponta para o registro canônico quando este for duplicata soft (dedupe). NULL = canônico.';

-- search_public_services_bbox_light (assinatura com equipment_natures)
DROP FUNCTION IF EXISTS public.search_public_services_bbox_light(
  double precision,
  double precision,
  double precision,
  double precision,
  text[],
  integer,
  integer,
  text[]
);

CREATE OR REPLACE FUNCTION public.search_public_services_bbox_light(
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  service_types text[] DEFAULT NULL,
  result_limit integer DEFAULT 1500,
  result_offset integer DEFAULT 0,
  equipment_natures text[] DEFAULT NULL
)
RETURNS SETOF public.public_services
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('statement_timeout', '120000', true);
  RETURN QUERY
  SELECT ps.*
  FROM public.public_services ps
  WHERE ps.latitude >= min_lat
    AND ps.latitude <= max_lat
    AND ps.longitude >= min_lng
    AND ps.longitude <= max_lng
    AND ps.duplicate_of IS NULL
    AND (
      service_types IS NULL
      OR coalesce(cardinality(service_types), 0) = 0
      OR ps.service_type = ANY(service_types::service_type[])
    )
    AND (
      equipment_natures IS NULL
      OR coalesce(cardinality(equipment_natures), 0) = 0
      OR ps.equipment_nature = ANY(equipment_natures)
    )
  LIMIT LEAST(GREATEST(coalesce(result_limit, 1500), 1), 5000)
  OFFSET GREATEST(coalesce(result_offset, 0), 0);
END;
$$;

ALTER FUNCTION public.search_public_services_bbox_light(
  double precision,
  double precision,
  double precision,
  double precision,
  text[],
  integer,
  integer,
  text[]
) SET statement_timeout TO '120s';

COMMENT ON FUNCTION public.search_public_services_bbox_light(
  double precision,
  double precision,
  double precision,
  double precision,
  text[],
  integer,
  integer,
  text[]
) IS
  'Bbox + tipo(s) + natureza(s); apenas canônicos (duplicate_of IS NULL).';

GRANT EXECUTE ON FUNCTION public.search_public_services_bbox_light(
  double precision,
  double precision,
  double precision,
  double precision,
  text[],
  integer,
  integer,
  text[]
) TO authenticated, anon;

-- search_public_services_bbox_light_cursor
CREATE OR REPLACE FUNCTION public.search_public_services_bbox_light_cursor(
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  service_types text[] DEFAULT NULL,
  last_id uuid DEFAULT NULL,
  result_limit integer DEFAULT 200
)
RETURNS SETOF public.public_services
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT ps.*
  FROM public.public_services ps
  WHERE ps.latitude >= min_lat::numeric
    AND ps.latitude <= max_lat::numeric
    AND ps.longitude >= min_lng::numeric
    AND ps.longitude <= max_lng::numeric
    AND ps.duplicate_of IS NULL
    AND (
      service_types IS NULL
      OR coalesce(cardinality(service_types), 0) = 0
      OR ps.service_type = ANY(service_types::service_type[])
    )
    AND (last_id IS NULL OR ps.id > last_id)
  ORDER BY ps.id ASC
  LIMIT LEAST(GREATEST(coalesce(result_limit, 200), 1), 500);
$$;

ALTER FUNCTION public.search_public_services_bbox_light_cursor(
  double precision,
  double precision,
  double precision,
  double precision,
  text[],
  uuid,
  integer
) SET statement_timeout TO '45s';

COMMENT ON FUNCTION public.search_public_services_bbox_light_cursor IS
  'Busca leve por bbox + tipo(s), paginação por id; apenas canônicos (duplicate_of IS NULL).';

GRANT EXECUTE ON FUNCTION public.search_public_services_bbox_light_cursor(
  double precision,
  double precision,
  double precision,
  double precision,
  text[],
  uuid,
  integer
) TO anon, authenticated;

-- search_public_services_fulltext (com min_radius_meters)
DROP FUNCTION IF EXISTS public.search_public_services_fulltext(
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
);

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
      AND ps.duplicate_of IS NULL
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
    AND (
      min_radius_meters IS NULL
      OR min_radius_meters <= 0::double precision
      OR s.dist_m >= min_radius_meters::double precision
    )
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
  integer,
  double precision
) SET statement_timeout TO '90s';

COMMENT ON FUNCTION public.search_public_services_fulltext IS
  'Lista public_services no bbox + raio Haversine; apenas canônicos (duplicate_of IS NULL).';

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
  integer,
  double precision
) TO anon, authenticated;

RESET statement_timeout;
