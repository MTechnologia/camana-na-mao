-- Relatos urbanos próximos: adiciona RAIO MÁXIMO (p_radius_meters) ao matching.
--
-- Antes: ordenava por distância (Haversine) e cortava em K=10 — SEM raio. Como há poucos
-- relatos por categoria, os "10 mais próximos" pegavam relatos a quilômetros (até 23 km!)
-- e os exibiam como "próximos do local informado". Agora aplicamos um raio (500 m por padrão
-- no chamador) para sugerir só relatos que plausivelmente são o MESMO problema/região.
--
-- p_radius_meters NULL = sem corte (compatibilidade). Drop+create porque muda a assinatura
-- (novo parâmetro); chamadas com 5 args continuam válidas (usam o default NULL).

DROP FUNCTION IF EXISTS public.nearest_urban_reports_by_distance(
  double precision, double precision, text, uuid, integer
);

CREATE OR REPLACE FUNCTION public.nearest_urban_reports_by_distance(
  p_lat double precision,
  p_lng double precision,
  p_category text,
  p_exclude_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 10,
  p_radius_meters double precision DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  protocol_code text,
  category text,
  subcategory text,
  description text,
  location_address text,
  neighborhood text,
  severity text,
  created_at timestamptz,
  distance_meters double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT
      ur.id,
      ur.protocol_code,
      ur.category,
      ur.subcategory,
      ur.description,
      ur.location_address,
      ur.neighborhood,
      ur.severity,
      ur.created_at,
      ur.latitude::double precision AS lat,
      ur.longitude::double precision AS lng
    FROM public.urban_reports ur
    WHERE ur.latitude IS NOT NULL
      AND ur.longitude IS NOT NULL
      AND ur.category = p_category
      AND ur.category <> 'feedback_camara'
      AND (p_exclude_user_id IS NULL OR ur.user_id <> p_exclude_user_id)
  ),
  scored AS (
    SELECT
      c.id,
      c.protocol_code,
      c.category,
      c.subcategory,
      LEFT(COALESCE(c.description, ''), 200) AS description,
      c.location_address,
      c.neighborhood,
      c.severity,
      c.created_at,
      (
        6371000.0 * acos(
          LEAST(1.0::double precision, GREATEST(-1.0::double precision,
            cos(radians(p_lat)) * cos(radians(c.lat))
            * cos(radians(c.lng) - radians(p_lng))
            + sin(radians(p_lat)) * sin(radians(c.lat))
          ))
        )
      )::double precision AS distance_meters
    FROM candidates c
  )
  SELECT
    s.id,
    s.protocol_code,
    s.category,
    s.subcategory,
    s.description,
    s.location_address,
    s.neighborhood,
    s.severity,
    s.created_at,
    s.distance_meters
  FROM scored s
  WHERE p_radius_meters IS NULL OR s.distance_meters <= p_radius_meters
  ORDER BY s.distance_meters ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
$$;

COMMENT ON FUNCTION public.nearest_urban_reports_by_distance(double precision, double precision, text, uuid, integer, double precision)
IS 'Lista os K relatos urbanos mais próximos (mesma categoria), ordenados por distância em metros, opcionalmente limitados a um raio (p_radius_meters).';

GRANT EXECUTE ON FUNCTION public.nearest_urban_reports_by_distance(double precision, double precision, text, uuid, integer, double precision)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.nearest_urban_reports_by_distance(double precision, double precision, text, uuid, integer, double precision)
  TO anon;
