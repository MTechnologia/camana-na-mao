-- OS-06 - Popular padrões automaticamente

-- 1) Ajustes na tabela de padrões
ALTER TABLE public.report_patterns
  ADD COLUMN IF NOT EXISTS peak_hours JSONB,
  ADD COLUMN IF NOT EXISTS avg_severity NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS window_start DATE,
  ADD COLUMN IF NOT EXISTS window_end DATE,
  ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_report_patterns_line_pattern
  ON public.report_patterns(line_id, pattern_type);

CREATE INDEX IF NOT EXISTS idx_report_patterns_status
  ON public.report_patterns(status);

CREATE INDEX IF NOT EXISTS idx_report_patterns_window
  ON public.report_patterns(window_start, window_end);

-- Garante unicidade por linha + tipo + janela analisada.
-- Isso ajuda a evitar duplicidade em reexecuções.
CREATE UNIQUE INDEX IF NOT EXISTS uq_report_patterns_line_pattern_window
  ON public.report_patterns(line_id, pattern_type, window_start, window_end);

-- 2) Log de execução da análise
CREATE TABLE IF NOT EXISTS public.pattern_analysis_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'success',
  reports_analyzed INTEGER NOT NULL DEFAULT 0,
  patterns_created INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pattern_analysis_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pattern_analysis_log'
      AND policyname = 'Admins can view pattern analysis logs'
  ) THEN
    CREATE POLICY "Admins can view pattern analysis logs"
      ON public.pattern_analysis_log
      FOR SELECT
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pattern_analysis_log'
      AND policyname = 'Service role can insert pattern analysis logs'
  ) THEN
    CREATE POLICY "Service role can insert pattern analysis logs"
      ON public.pattern_analysis_log
      FOR INSERT
      WITH CHECK (true);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_pattern_analysis_log_executed_at
  ON public.pattern_analysis_log(executed_at DESC);

-- 3) RPC principal
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
  -- Conta apenas relatos elegíveis para análise
  SELECT COUNT(*)
    INTO v_reports_analyzed
  FROM public.transport_reports tr
  WHERE tr.occurrence_date >= v_window_start
    AND tr.occurrence_date <= v_window_end
    AND tr.line_id IS NOT NULL
    AND tr.report_type IS NOT NULL;

  -- Remove resultados da mesma janela para evitar duplicidade em reexecução
  DELETE FROM public.report_patterns
  WHERE window_start = v_window_start
    AND window_end = v_window_end;

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