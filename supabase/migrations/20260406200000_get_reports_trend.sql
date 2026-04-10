-- Tendência temporal de reclamações e avaliações por categoria (admin/gestor)

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
  IF auth.uid() IS NULL OR NOT public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]) THEN
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

REVOKE ALL ON FUNCTION public.get_reports_trend(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reports_trend(text, uuid, text) TO authenticated;
