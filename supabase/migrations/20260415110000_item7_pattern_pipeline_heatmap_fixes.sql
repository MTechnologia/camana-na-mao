-- ITEM 7 - ajustes finais do pipeline de padrões e do heatmap

-- HU-7.1: reexecuções da análise devem confiar apenas no upsert da janela atual.
CREATE OR REPLACE FUNCTION public.analyze_report_patterns()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_window_start DATE := current_date - 30;
  v_window_end DATE := current_date;
  v_reports_analyzed INTEGER := 0;
  v_patterns_created INTEGER := 0;
BEGIN
  SELECT COUNT(*)
    INTO v_reports_analyzed
  FROM public.transport_reports tr
  WHERE tr.occurrence_date >= v_window_start
    AND tr.occurrence_date <= v_window_end
    AND tr.line_id IS NOT NULL
    AND tr.report_type IS NOT NULL;

  WITH base_reports AS (
    SELECT
      tr.id,
      tr.line_id,
      tr.report_type,
      tr.severity,
      tr.occurrence_date,
      tr.occurrence_time,
      tr.created_at,
      CASE tr.severity
        WHEN 'low' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'high' THEN 3
        WHEN 'critical' THEN 4
        ELSE NULL
      END AS severity_score
    FROM public.transport_reports tr
    WHERE tr.occurrence_date >= v_window_start
      AND tr.occurrence_date <= v_window_end
      AND tr.line_id IS NOT NULL
      AND tr.report_type IS NOT NULL
  ),
  grouped AS (
    SELECT
      br.line_id,
      br.report_type AS pattern_type,
      COUNT(*) AS occurrence_count,
      MIN((br.occurrence_date + COALESCE(br.occurrence_time, TIME '00:00')) AT TIME ZONE 'UTC') AS first_detected_at,
      MAX((br.occurrence_date + COALESCE(br.occurrence_time, TIME '00:00')) AT TIME ZONE 'UTC') AS last_occurrence_at,
      ROUND(AVG(br.severity_score)::NUMERIC, 2) AS avg_severity_num
    FROM base_reports br
    GROUP BY br.line_id, br.report_type
    HAVING COUNT(*) >= 3
  ),
  hourly_counts AS (
    SELECT
      br.line_id,
      br.report_type AS pattern_type,
      EXTRACT(HOUR FROM br.occurrence_time)::INT AS hour_bucket,
      COUNT(*) AS total_reports
    FROM base_reports br
    WHERE br.occurrence_time IS NOT NULL
    GROUP BY br.line_id, br.report_type, EXTRACT(HOUR FROM br.occurrence_time)
  ),
  ranked_hours AS (
    SELECT
      hc.line_id,
      hc.pattern_type,
      hc.hour_bucket,
      hc.total_reports,
      ROW_NUMBER() OVER (
        PARTITION BY hc.line_id, hc.pattern_type
        ORDER BY hc.total_reports DESC, hc.hour_bucket ASC
      ) AS rn
    FROM hourly_counts hc
  ),
  peak_hours_by_pattern AS (
    SELECT
      rh.line_id,
      rh.pattern_type,
      jsonb_agg(
        jsonb_build_object(
          'hour', rh.hour_bucket,
          'count', rh.total_reports
        )
        ORDER BY rh.total_reports DESC, rh.hour_bucket ASC
      ) AS peak_hours
    FROM ranked_hours rh
    WHERE rh.rn <= 3
    GROUP BY rh.line_id, rh.pattern_type
  ),
  prepared AS (
    SELECT
      g.line_id,
      g.pattern_type,
      CONCAT(
        'Padrão detectado automaticamente: ',
        g.occurrence_count,
        ' relatos do tipo "',
        g.pattern_type,
        '" na linha ',
        COALESCE(tl.line_code || ' - ' || tl.line_name, 'não identificada'),
        ' nos últimos 30 dias.'
      ) AS description,
      g.occurrence_count,
      g.first_detected_at,
      g.last_occurrence_at,
      CASE
        WHEN g.avg_severity_num >= 3.5 THEN 'critical'
        WHEN g.avg_severity_num >= 2.5 THEN 'high'
        WHEN g.avg_severity_num >= 1.5 THEN 'medium'
        ELSE 'low'
      END AS average_severity,
      CASE
        WHEN g.avg_severity_num >= 3.5 THEN 'Avaliar ação corretiva imediata'
        WHEN g.avg_severity_num >= 2.5 THEN 'Priorizar tratativa operacional'
        ELSE 'Monitorar recorrência'
      END AS suggested_action,
      g.avg_severity_num AS avg_severity,
      COALESCE(ph.peak_hours, '[]'::JSONB) AS peak_hours,
      v_window_start AS window_start,
      v_window_end AS window_end,
      now() AS last_analyzed_at
    FROM grouped g
    LEFT JOIN public.transport_lines tl
      ON tl.id = g.line_id
    LEFT JOIN peak_hours_by_pattern ph
      ON ph.line_id = g.line_id
     AND ph.pattern_type = g.pattern_type
  )
  INSERT INTO public.report_patterns (
    line_id,
    pattern_type,
    description,
    occurrence_count,
    first_detected_at,
    last_occurrence_at,
    average_severity,
    suggested_action,
    status,
    avg_severity,
    peak_hours,
    window_start,
    window_end,
    last_analyzed_at
  )
  SELECT
    p.line_id,
    p.pattern_type,
    p.description,
    p.occurrence_count,
    p.first_detected_at,
    p.last_occurrence_at,
    p.average_severity,
    p.suggested_action,
    'active',
    p.avg_severity,
    p.peak_hours,
    p.window_start,
    p.window_end,
    p.last_analyzed_at
  FROM prepared p
  ON CONFLICT (line_id, pattern_type, window_start, window_end)
  DO UPDATE SET
    description = EXCLUDED.description,
    occurrence_count = EXCLUDED.occurrence_count,
    first_detected_at = EXCLUDED.first_detected_at,
    last_occurrence_at = EXCLUDED.last_occurrence_at,
    average_severity = EXCLUDED.average_severity,
    suggested_action = EXCLUDED.suggested_action,
    status = EXCLUDED.status,
    avg_severity = EXCLUDED.avg_severity,
    peak_hours = EXCLUDED.peak_hours,
    last_analyzed_at = EXCLUDED.last_analyzed_at;

  GET DIAGNOSTICS v_patterns_created = ROW_COUNT;

  INSERT INTO public.pattern_analysis_log (
    status,
    reports_analyzed,
    patterns_created,
    message
  )
  VALUES (
    'success',
    v_reports_analyzed,
    v_patterns_created,
    'Análise semanal executada com sucesso'
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'reports_analyzed', v_reports_analyzed,
    'patterns_created', v_patterns_created,
    'window_start', v_window_start,
    'window_end', v_window_end
  );

EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO public.pattern_analysis_log (
      status,
      reports_analyzed,
      patterns_created,
      message,
      error_details
    )
    VALUES (
      'error',
      COALESCE(v_reports_analyzed, 0),
      COALESCE(v_patterns_created, 0),
      'Erro ao executar análise semanal',
      SQLERRM
    );

    RAISE;
END;
$$;

-- HU-7.4: grade mais coarse (ROUND(..., 3)) e sem tipo "transport" na RPC.
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
      round(ur.latitude::numeric, 3) AS lat_r,
      round(ur.longitude::numeric, 3) AS lng_r,
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
      round(ps.latitude::numeric, 3) AS lat_r,
      round(ps.longitude::numeric, 3) AS lng_r,
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
