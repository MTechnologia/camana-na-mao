-- search_public_services_bbox_light: evita ::numeric nos predicados (alinha a latitude/longitude float8)
-- e força statement_timeout na transação da função (pool/role costumam cortar ~3–8s).

SET statement_timeout = 0;

CREATE OR REPLACE FUNCTION public.search_public_services_bbox_light(
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  service_types text[] DEFAULT NULL,
  result_limit integer DEFAULT 1500,
  result_offset integer DEFAULT 0
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
    AND (
      service_types IS NULL
      OR coalesce(cardinality(service_types), 0) = 0
      OR ps.service_type = ANY(service_types::service_type[])
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
  integer
) SET statement_timeout TO '120s';

COMMENT ON FUNCTION public.search_public_services_bbox_light(
  double precision,
  double precision,
  double precision,
  double precision,
  text[],
  integer,
  integer
) IS
  'Bbox + tipo(s), sem ORDER BY; predicados float8; timeout local na transação.';

RESET statement_timeout;
