-- Ranking de piores médias por dimensão de avaliação (1–5), apenas ratings publicados com rating_dimensions preenchido

CREATE OR REPLACE FUNCTION public.get_worst_services_by_dimension(
  p_dimension text,
  p_period text DEFAULT '30d',
  p_limit int DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_lim int;
  result json;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_dimension IS NULL OR p_dimension NOT IN ('atendimento', 'limpeza', 'infraestrutura', 'tempo_espera') THEN
    RAISE EXCEPTION 'invalid dimension' USING ERRCODE = '22023';
  END IF;

  v_lim := least(greatest(coalesce(p_limit, 20), 1), 100);

  CASE coalesce(p_period, '30d')
    WHEN '7d' THEN v_start := now() - interval '7 days';
    WHEN '30d' THEN v_start := now() - interval '30 days';
    WHEN '90d' THEN v_start := now() - interval '90 days';
    WHEN '12m' THEN v_start := now() - interval '12 months';
    ELSE v_start := now() - interval '30 days';
  END CASE;

  WITH dim_scores AS (
    SELECT
      sr.service_id,
      (sr.rating_dimensions->>p_dimension)::numeric AS dim_score
    FROM service_ratings sr
    WHERE sr.publication_status = 'published'
      AND sr.rating_dimensions IS NOT NULL
      AND sr.rating_dimensions ? p_dimension
      AND sr.created_at IS NOT NULL
      AND sr.created_at >= v_start
  ),
  filtered AS (
    SELECT service_id, dim_score
    FROM dim_scores
    WHERE dim_score IS NOT NULL
      AND dim_score >= 1
      AND dim_score <= 5
  ),
  agg AS (
    SELECT
      f.service_id,
      avg(f.dim_score) AS avg_dim,
      count(*)::int AS cnt
    FROM filtered f
    GROUP BY f.service_id
  ),
  ranked AS (
    SELECT
      ps.id AS service_id,
      ps.name,
      ps.service_type::text AS service_type,
      ps.district,
      round(a.avg_dim::numeric, 2)::float AS avg_dimension,
      a.cnt AS rating_count
    FROM agg a
    INNER JOIN public_services ps ON ps.id = a.service_id
    ORDER BY a.avg_dim ASC, a.cnt DESC, ps.name
    LIMIT v_lim
  )
  SELECT json_build_object(
    'dimension', p_dimension,
    'period', coalesce(p_period, '30d'),
    'limit', v_lim,
    'start_at', v_start,
    'items', coalesce(
      (
        SELECT json_agg(
          json_build_object(
            'service_id', r.service_id,
            'name', r.name,
            'service_type', r.service_type,
            'district', r.district,
            'avg_dimension', r.avg_dimension,
            'rating_count', r.rating_count
          )
          ORDER BY r.avg_dimension ASC, r.rating_count DESC, r.name
        )
        FROM ranked r
      ),
      '[]'::json
    )
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_worst_services_by_dimension(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_worst_services_by_dimension(text, text, integer) TO authenticated;
