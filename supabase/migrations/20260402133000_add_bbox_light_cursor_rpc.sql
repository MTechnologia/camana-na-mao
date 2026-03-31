-- RPC leve com paginação por cursor (id) para evitar timeouts em bbox grande.

SET statement_timeout = 0;

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
  'Busca leve de public_services por bbox + tipo(s), com paginação por cursor id.';

GRANT EXECUTE ON FUNCTION public.search_public_services_bbox_light_cursor(
  double precision,
  double precision,
  double precision,
  double precision,
  text[],
  uuid,
  integer
) TO anon, authenticated;

RESET statement_timeout;
