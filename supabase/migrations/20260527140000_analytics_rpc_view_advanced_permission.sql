-- Alinha RPCs de analytics admin com analytics.view_advanced (HU-11), não só papéis gestor/admin.

CREATE OR REPLACE FUNCTION public.get_reports_trend(
  p_type text DEFAULT NULL,
  p_line_id uuid DEFAULT NULL,
  p_period text DEFAULT '30d'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_bucket text;
  result json;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[])
    OR public.has_permission(auth.uid(), 'analytics.view_advanced')
  ) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  CASE COALESCE(p_period, '30d')
    WHEN '7d' THEN
      v_start := now() - interval '7 days';
      v_bucket := 'day';
    WHEN '30d' THEN
      v_start := now() - interval '30 days';
      v_bucket := 'day';
    WHEN '90d' THEN
      v_start := now() - interval '90 days';
      v_bucket := 'week';
    WHEN '12m' THEN
      v_start := now() - interval '12 months';
      v_bucket := 'month';
    ELSE
      v_start := now() - interval '30 days';
      v_bucket := 'day';
  END CASE;

  WITH
  filtered_urban AS (
    SELECT
      CASE v_bucket
        WHEN 'day' THEN date_trunc('day', ur.created_at)
        WHEN 'week' THEN date_trunc('week', ur.created_at)
        WHEN 'month' THEN date_trunc('month', ur.created_at)
      END AS bucket,
      COALESCE(ur.category, 'sem_categoria') AS category
    FROM urban_reports ur
    WHERE ur.created_at IS NOT NULL
      AND ur.created_at >= v_start
      AND (p_type IS NULL OR p_type = 'urban')
  ),
  filtered_transport AS (
    SELECT
      CASE v_bucket
        WHEN 'day' THEN date_trunc('day', x.ts)
        WHEN 'week' THEN date_trunc('week', x.ts)
        WHEN 'month' THEN date_trunc('month', x.ts)
      END AS bucket,
      COALESCE(tr.report_type, 'sem_tipo') AS category
    FROM transport_reports tr
    CROSS JOIN LATERAL (
      SELECT COALESCE(tr.created_at, tr.occurrence_date::timestamptz) AS ts
    ) x
    WHERE x.ts IS NOT NULL
      AND x.ts >= v_start
      AND (p_type IS NULL OR p_type = 'transport')
      AND (p_line_id IS NULL OR tr.line_id = p_line_id)
  ),
  filtered_evaluations AS (
    SELECT
      CASE v_bucket
        WHEN 'day' THEN date_trunc('day', sr.created_at)
        WHEN 'week' THEN date_trunc('week', sr.created_at)
        WHEN 'month' THEN date_trunc('month', sr.created_at)
      END AS bucket,
      COALESCE(ps.service_type::text, 'ubs') AS category
    FROM service_ratings sr
    LEFT JOIN public_services ps ON sr.service_id = ps.id
    WHERE sr.publication_status = 'published'
      AND sr.created_at IS NOT NULL
      AND sr.created_at >= v_start
      AND (p_type IS NULL OR p_type = 'evaluation')
  ),
  combined AS (
    SELECT bucket, category FROM filtered_urban
    UNION ALL
    SELECT bucket, category FROM filtered_transport
    UNION ALL
    SELECT bucket, category FROM filtered_evaluations
  ),
  agg AS (
    SELECT bucket, category, COUNT(*)::bigint AS cnt
    FROM combined
    GROUP BY bucket, category
  )
  SELECT json_build_object(
    'granularity', v_bucket,
    'period', COALESCE(p_period, '30d'),
    'start_at', v_start,
    'points', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'bucket', a.bucket,
            'category', a.category,
            'count', a.cnt
          )
          ORDER BY a.bucket, a.category
        )
        FROM agg a
      ),
      '[]'::json
    )
  ) INTO result;

  RETURN result;
END;
$$;

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
  IF auth.uid() IS NULL OR NOT (
    public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[])
    OR public.has_permission(auth.uid(), 'analytics.view_advanced')
  ) THEN
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

GRANT EXECUTE ON FUNCTION public.get_reports_trend(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reports_heatmap_data(text, text) TO authenticated;
