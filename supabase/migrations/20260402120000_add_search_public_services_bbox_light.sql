-- RPC leve para "Perto de Você" sem busca textual:
-- usa apenas bbox + tipo(s) + paginação, evitando custo de Haversine no banco.
-- A distância final continua calculada no frontend (já existente).

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
  ORDER BY ps.id ASC
  LIMIT LEAST(GREATEST(coalesce(result_limit, 1500), 1), 5000)
  OFFSET GREATEST(coalesce(result_offset, 0), 0);
$$;

ALTER FUNCTION public.search_public_services_bbox_light(
  double precision,
  double precision,
  double precision,
  double precision,
  text[],
  integer,
  integer
) SET statement_timeout TO '45s';

COMMENT ON FUNCTION public.search_public_services_bbox_light IS
  'Busca leve de public_services por bbox + tipo(s), sem cálculo de distância no banco.';

GRANT EXECUTE ON FUNCTION public.search_public_services_bbox_light(
  double precision,
  double precision,
  double precision,
  double precision,
  text[],
  integer,
  integer
) TO anon, authenticated;

RESET statement_timeout;
