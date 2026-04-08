-- Mapa de calor geográfico (admin): pontos agregados em grade fina, apenas dentro do município de São Paulo (bbox aproximado)

CREATE OR REPLACE FUNCTION public.get_reports_heatmap_data(
  p_type text DEFAULT NULL,
  p_period text DEFAULT '30d'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  result json;
  v_cell_count int;
  v_points json;
  v_limit int := 6000;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  CASE COALESCE(p_period, '30d')
    WHEN '7d' THEN v_start := now() - interval '7 days';
    WHEN '30d' THEN v_start := now() - interval '30 days';
    WHEN '90d' THEN v_start := now() - interval '90 days';
    WHEN '12m' THEN v_start := now() - interval '12 months';
    ELSE v_start := now() - interval '30 days';
  END CASE;

  WITH urban_agg AS (
    SELECT
      round(ur.latitude::numeric, 5) AS lat_r,
      round(ur.longitude::numeric, 5) AS lng_r,
      count(*)::int AS w
    FROM urban_reports ur
    WHERE ur.latitude IS NOT NULL
      AND ur.longitude IS NOT NULL
      AND ur.latitude BETWEEN -23.90 AND -23.30
      AND ur.longitude BETWEEN -46.85 AND -46.36
      AND abs(ur.latitude) > 0.02
      AND abs(ur.longitude) > 0.02
      AND ur.created_at IS NOT NULL
      AND ur.created_at >= v_start
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'urban')
    GROUP BY 1, 2
  ),
  eval_agg AS (
    SELECT
      round(ps.latitude::numeric, 5) AS lat_r,
      round(ps.longitude::numeric, 5) AS lng_r,
      count(*)::int AS w
    FROM service_ratings sr
    INNER JOIN public_services ps ON sr.service_id = ps.id
    WHERE sr.publication_status = 'published'
      AND sr.created_at IS NOT NULL
      AND sr.created_at >= v_start
      AND ps.latitude BETWEEN -23.90 AND -23.30
      AND ps.longitude BETWEEN -46.85 AND -46.36
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'evaluation')
    GROUP BY 1, 2
  ),
  combined AS (
    SELECT lat_r, lng_r, w FROM urban_agg
    UNION ALL
    SELECT lat_r, lng_r, w FROM eval_agg
  ),
  rolled AS (
    SELECT lat_r, lng_r, sum(w)::int AS weight
    FROM combined
    GROUP BY lat_r, lng_r
  )
  SELECT
    (SELECT count(*)::int FROM rolled),
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'lat', lat_r::float8,
            'lng', lng_r::float8,
            'weight', weight
          )
          ORDER BY weight DESC, lat_r, lng_r
        )
        FROM (
          SELECT lat_r, lng_r, weight
          FROM rolled
          ORDER BY weight DESC, lat_r, lng_r
          LIMIT v_limit
        ) top_cells
      ),
      '[]'::json
    )
  INTO v_cell_count, v_points;

  result := json_build_object(
    'period', COALESCE(p_period, '30d'),
    'start_at', v_start,
    'points', v_points,
    'truncated', COALESCE(v_cell_count, 0) > v_limit
  );

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_reports_heatmap_data(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reports_heatmap_data(text, text) TO authenticated;
