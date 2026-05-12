-- HU-7: resumo analítico para /paineis, piores serviços por dimensão, eventos de threshold pós-análise

-- ---------------------------------------------------------------------------
-- 1) Eventos de threshold (preenchidos após analyze_report_patterns via RPC)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.report_pattern_threshold_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id uuid REFERENCES public.transport_lines (id) ON DELETE SET NULL,
  pattern_type text NOT NULL,
  alert_level text NOT NULL CHECK (alert_level IN ('warning', 'critical')),
  occurrence_count integer,
  avg_severity numeric,
  average_severity text,
  description text,
  window_start date NOT NULL,
  window_end date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_pattern_threshold_events_window
  ON public.report_pattern_threshold_events (window_end DESC, alert_level);

ALTER TABLE public.report_pattern_threshold_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_pattern_threshold_events'
      AND policyname = 'Anyone authenticated can view pattern threshold events'
  ) THEN
    CREATE POLICY "Anyone authenticated can view pattern threshold events"
      ON public.report_pattern_threshold_events
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

COMMENT ON TABLE public.report_pattern_threshold_events IS
  'HU-7.6: alertas derivados do pipeline (analyze_report_patterns + sync_pattern_threshold_events).';

GRANT SELECT ON TABLE public.report_pattern_threshold_events TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Sincroniza eventos a partir de report_patterns da janela corrente (últimos 30 dias)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_pattern_threshold_events()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_end date := current_date;
  v_window_start date := current_date - 30;
  n_deleted int;
  n_inserted int;
BEGIN
  IF coalesce((SELECT auth.jwt()->>'role'), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.report_pattern_threshold_events
  WHERE window_start = v_window_start
    AND window_end = v_window_end;
  GET DIAGNOSTICS n_deleted = ROW_COUNT;

  INSERT INTO public.report_pattern_threshold_events (
    line_id,
    pattern_type,
    alert_level,
    occurrence_count,
    avg_severity,
    average_severity,
    description,
    window_start,
    window_end
  )
  SELECT
    rp.line_id,
    rp.pattern_type,
    CASE
      WHEN rp.occurrence_count >= 25
        OR rp.average_severity = 'critical'
        OR (rp.avg_severity IS NOT NULL AND rp.avg_severity >= 3.5)
      THEN 'critical'
      ELSE 'warning'
    END,
    rp.occurrence_count,
    rp.avg_severity,
    rp.average_severity,
    rp.description,
    rp.window_start,
    rp.window_end
  FROM public.report_patterns rp
  WHERE rp.window_start = v_window_start
    AND rp.window_end = v_window_end
    AND rp.status = 'active'
    AND (
      rp.occurrence_count >= 15
      OR rp.average_severity IN ('high', 'critical')
      OR (rp.avg_severity IS NOT NULL AND rp.avg_severity >= 2.5)
    );
  GET DIAGNOSTICS n_inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'window_start', v_window_start,
    'window_end', v_window_end,
    'deleted', n_deleted,
    'inserted', n_inserted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_pattern_threshold_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_pattern_threshold_events() TO service_role;

-- ---------------------------------------------------------------------------
-- 3) Piores equipamentos por dimensão (média ascendente = pior)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_worst_services_by_dimension(
  p_dimension text,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dim text := lower(trim(p_dimension));
  lim int := least(greatest(coalesce(p_limit, 20), 1), 100);
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_any_role(
      auth.uid(),
      ARRAY['admin', 'gestor', 'cidadao_engajado']::public.app_role[]
    ) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF dim NOT IN ('tempo_espera', 'atendimento', 'infraestrutura', 'limpeza') THEN
    RAISE EXCEPTION 'invalid dimension' USING ERRCODE = '22023';
  END IF;

  RETURN (
    WITH src AS (
      SELECT
        sr.service_id,
        COALESCE(NULLIF(sr.dimensions, '{}'::jsonb), sr.rating_dimensions, '{}'::jsonb) AS d
      FROM public.service_ratings sr
      WHERE sr.publication_status = 'published'
        AND (
          (sr.rating_dimensions IS NOT NULL AND sr.rating_dimensions <> '{}'::jsonb)
          OR (sr.dimensions IS NOT NULL AND sr.dimensions <> '{}'::jsonb)
        )
    ),
    scored AS (
      SELECT
        s.service_id,
        CASE
          WHEN (s.d->>dim) ~ '^[0-9]+(\.[0-9]+)?$' THEN (s.d->>dim)::numeric
          ELSE NULL
        END AS score
      FROM src s
    ),
    agg AS (
      SELECT
        sc.service_id,
        round(avg(sc.score)::numeric, 2) AS avg_score,
        count(*)::int AS rating_count
      FROM scored sc
      WHERE sc.score IS NOT NULL
        AND sc.score >= 1
        AND sc.score <= 5
      GROUP BY sc.service_id
      HAVING count(*) >= 2
    ),
    ranked AS (
      SELECT
        ps.id AS service_id,
        ps.name AS service_name,
        ps.district,
        ps.service_type::text AS service_type,
        a.avg_score,
        a.rating_count,
        row_number() OVER (ORDER BY a.avg_score ASC, a.rating_count DESC) AS rn
      FROM agg a
      INNER JOIN public.public_services ps ON ps.id = a.service_id
    )
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'service_id', r.service_id,
          'service_name', r.service_name,
          'district', r.district,
          'service_type', r.service_type,
          'avg_score', r.avg_score,
          'rating_count', r.rating_count
        )
        ORDER BY r.avg_score ASC, r.rating_count DESC
      ),
      '[]'::jsonb
    )
    FROM ranked r
    WHERE r.rn <= lim
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_worst_services_by_dimension(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_worst_services_by_dimension(text, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Resumo agregado para o dashboard /paineis (substitui mocks)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_analytics_dashboard_summary(
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end timestamptz;
  v_start timestamptz;
  v_prev_start timestamptz;
  v_prev_end timestamptz;
  result jsonb;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_any_role(
      auth.uid(),
      ARRAY['admin', 'gestor', 'cidadao_engajado']::public.app_role[]
    ) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  v_end := coalesce(p_end, now());
  v_start := coalesce(p_start, v_end - interval '180 days');
  v_prev_end := v_start;
  v_prev_start := v_start - (v_end - v_start);

  WITH
  bounds AS (
    SELECT v_start AS s, v_end AS e, v_prev_start AS ps, v_prev_end AS pe
  ),
  urban_cur AS (
    SELECT count(*)::bigint AS n
    FROM public.urban_reports ur, bounds b
    WHERE ur.created_at >= b.s AND ur.created_at <= b.e
  ),
  urban_prev AS (
    SELECT count(*)::bigint AS n
    FROM public.urban_reports ur, bounds b
    WHERE ur.created_at >= b.ps AND ur.created_at < b.pe
  ),
  transport_cur AS (
    SELECT count(*)::bigint AS n
    FROM public.transport_reports tr, bounds b
    WHERE coalesce(tr.created_at, tr.occurrence_date::timestamptz) >= b.s
      AND coalesce(tr.created_at, tr.occurrence_date::timestamptz) <= b.e
  ),
  transport_prev AS (
    SELECT count(*)::bigint AS n
    FROM public.transport_reports tr, bounds b
    WHERE coalesce(tr.created_at, tr.occurrence_date::timestamptz) >= b.ps
      AND coalesce(tr.created_at, tr.occurrence_date::timestamptz) < b.pe
  ),
  ratings_cur AS (
    SELECT
      count(*)::bigint AS total,
      count(*) FILTER (WHERE sr.rating_stars >= 4)::bigint AS pos
    FROM public.service_ratings sr, bounds b
    WHERE sr.publication_status = 'published'
      AND sr.created_at >= b.s
      AND sr.created_at <= b.e
  ),
  ratings_prev AS (
    SELECT
      count(*)::bigint AS total,
      count(*) FILTER (WHERE sr.rating_stars >= 4)::bigint AS pos
    FROM public.service_ratings sr, bounds b
    WHERE sr.publication_status = 'published'
      AND sr.created_at >= b.ps
      AND sr.created_at < b.pe
  ),
  critical_cur AS (
    SELECT count(*)::bigint AS n
    FROM (
      SELECT ur.severity
      FROM public.urban_reports ur, bounds b
      WHERE ur.created_at >= b.s AND ur.created_at <= b.e
      UNION ALL
      SELECT tr.severity
      FROM public.transport_reports tr, bounds b
      WHERE coalesce(tr.created_at, tr.occurrence_date::timestamptz) >= b.s
        AND coalesce(tr.created_at, tr.occurrence_date::timestamptz) <= b.e
    ) x
    WHERE x.severity IN ('high', 'critical')
  ),
  critical_prev AS (
    SELECT count(*)::bigint AS n
    FROM (
      SELECT ur.severity
      FROM public.urban_reports ur, bounds b
      WHERE ur.created_at >= b.ps AND ur.created_at < b.pe
      UNION ALL
      SELECT tr.severity
      FROM public.transport_reports tr, bounds b
      WHERE coalesce(tr.created_at, tr.occurrence_date::timestamptz) >= b.ps
        AND coalesce(tr.created_at, tr.occurrence_date::timestamptz) < b.pe
    ) x
    WHERE x.severity IN ('high', 'critical')
  ),
  regions_cur AS (
    SELECT count(DISTINCT lower(trim(ur.neighborhood)))::bigint AS n
    FROM public.urban_reports ur, bounds b
    WHERE ur.created_at >= b.s
      AND ur.created_at <= b.e
      AND ur.neighborhood IS NOT NULL
      AND btrim(ur.neighborhood) <> ''
  ),
  regions_prev AS (
    SELECT count(DISTINCT lower(trim(ur.neighborhood)))::bigint AS n
    FROM public.urban_reports ur, bounds b
    WHERE ur.created_at >= b.ps
      AND ur.created_at < b.pe
      AND ur.neighborhood IS NOT NULL
      AND btrim(ur.neighborhood) <> ''
  ),
  kpi AS (
    SELECT
      (SELECT n FROM urban_cur) + (SELECT n FROM transport_cur) AS total_reports_cur,
      (SELECT n FROM urban_prev) + (SELECT n FROM transport_prev) AS total_reports_prev,
      CASE
        WHEN (SELECT total FROM ratings_cur) > 0
        THEN round(100.0 * (SELECT pos FROM ratings_cur) / (SELECT total FROM ratings_cur))::int
        ELSE 0
      END AS positive_rate_cur,
      CASE
        WHEN (SELECT total FROM ratings_prev) > 0
        THEN round(100.0 * (SELECT pos FROM ratings_prev) / (SELECT total FROM ratings_prev))::int
        ELSE 0
      END AS positive_rate_prev,
      (SELECT n FROM critical_cur) AS critical_cur,
      (SELECT n FROM critical_prev) AS critical_prev,
      (SELECT n FROM regions_cur) AS regions_cur,
      (SELECT n FROM regions_prev) AS regions_prev
  ),
  month_series AS (
    SELECT date_trunc('month', gs)::date AS m
    FROM bounds b
    CROSS JOIN LATERAL generate_series(
      date_trunc('month', b.s)::timestamp,
      date_trunc('month', b.e)::timestamp,
      interval '1 month'
    ) AS gs
  ),
  reports_by_month AS (
    SELECT
      date_trunc('month', ur.created_at)::date AS m,
      count(*)::int AS c
    FROM public.urban_reports ur, bounds b
    WHERE ur.created_at >= b.s AND ur.created_at <= b.e
    GROUP BY 1
    UNION ALL
    SELECT
      date_trunc('month', coalesce(tr.created_at, tr.occurrence_date::timestamptz))::date AS m,
      count(*)::int AS c
    FROM public.transport_reports tr, bounds b
    WHERE coalesce(tr.created_at, tr.occurrence_date::timestamptz) >= b.s
      AND coalesce(tr.created_at, tr.occurrence_date::timestamptz) <= b.e
    GROUP BY 1
  ),
  reports_month_agg AS (
    SELECT m, sum(c)::int AS reports
    FROM reports_by_month
    GROUP BY m
  ),
  sat_by_month AS (
    SELECT
      date_trunc('month', sr.created_at)::date AS m,
      round(avg(sr.rating_stars)::numeric * 20, 0)::int AS satisfaction
    FROM public.service_ratings sr, bounds b
    WHERE sr.publication_status = 'published'
      AND sr.created_at >= b.s
      AND sr.created_at <= b.e
      AND sr.rating_stars IS NOT NULL
    GROUP BY 1
  ),
  time_series AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'period', to_char(ms.m::timestamp, 'YYYY-MM'),
          'reports', coalesce(r.reports, 0),
          'satisfaction', coalesce(s.satisfaction, 0)
        )
        ORDER BY ms.m
      ),
      '[]'::jsonb
    ) AS ts
    FROM month_series ms
    LEFT JOIN reports_month_agg r ON r.m = ms.m
    LEFT JOIN sat_by_month s ON s.m = ms.m
  ),
  urban_cat AS (
    SELECT
      coalesce(ur.category, 'outro') AS k,
      count(*)::int AS c
    FROM public.urban_reports ur, bounds b
    WHERE ur.created_at >= b.s AND ur.created_at <= b.e
    GROUP BY 1
  ),
  transport_sum AS (
    SELECT count(*)::int AS c
    FROM public.transport_reports tr, bounds b
    WHERE coalesce(tr.created_at, tr.occurrence_date::timestamptz) >= b.s
      AND coalesce(tr.created_at, tr.occurrence_date::timestamptz) <= b.e
  ),
  category_rows AS (
    SELECT jsonb_build_object(
      'name',
      CASE u.k
        WHEN 'saude' THEN 'Saúde'
        WHEN 'educacao' THEN 'Educação'
        WHEN 'seguranca' THEN 'Segurança'
        WHEN 'transporte' THEN 'Transporte urbano'
        WHEN 'meio_ambiente' THEN 'Meio ambiente'
        WHEN 'iluminacao' THEN 'Iluminação'
        WHEN 'pavimentacao' THEN 'Pavimentação'
        WHEN 'drenagem' THEN 'Drenagem'
        WHEN 'sinalizacao' THEN 'Sinalização'
        WHEN 'acessibilidade' THEN 'Acessibilidade'
        WHEN 'limpeza_urbana' THEN 'Limpeza'
        WHEN 'esgoto' THEN 'Esgoto'
        WHEN 'area_verde' THEN 'Área verde'
        WHEN 'higiene_urbana' THEN 'Higiene urbana'
        WHEN 'animais' THEN 'Animais'
        WHEN 'poluicao' THEN 'Poluição'
        WHEN 'feedback_camara' THEN 'Feedback Câmara'
        ELSE initcap(replace(u.k, '_', ' '))
      END,
      'value',
      u.c
    ) AS obj
    FROM urban_cat u
    WHERE u.c > 0
    UNION ALL
    SELECT jsonb_build_object('name', 'Transporte (relatos)', 'value', (SELECT c FROM transport_sum))
    WHERE (SELECT c FROM transport_sum) > 0
  ),
  category_distribution AS (
    SELECT coalesce(
      (SELECT jsonb_agg(x.obj ORDER BY (x.obj->>'value')::int DESC) FROM category_rows x),
      '[]'::jsonb
    ) AS cd
  ),
  heatmap_cells AS (
    SELECT
      CASE (extract(isodow FROM ur.created_at AT TIME ZONE 'America/Sao_Paulo'))::int
        WHEN 1 THEN 'Seg'
        WHEN 2 THEN 'Ter'
        WHEN 3 THEN 'Qua'
        WHEN 4 THEN 'Qui'
        WHEN 5 THEN 'Sex'
        WHEN 6 THEN 'Sáb'
        ELSE 'Dom'
      END AS y,
      CASE
        WHEN ur.neighborhood IS NULL OR btrim(ur.neighborhood) = '' THEN 'Outros'
        WHEN lower(ur.neighborhood) LIKE '%centro%' THEN 'Centro'
        WHEN lower(ur.neighborhood) LIKE '%norte%'
          OR lower(ur.neighborhood) LIKE '%casa verde%'
          OR lower(ur.neighborhood) LIKE '%tucuruvi%'
        THEN 'Norte'
        WHEN lower(ur.neighborhood) LIKE '%sul%'
          OR lower(ur.neighborhood) LIKE '%santo amaro%'
          OR lower(ur.neighborhood) LIKE '%campo limpo%'
        THEN 'Sul'
        WHEN lower(ur.neighborhood) LIKE '%leste%'
          OR lower(ur.neighborhood) LIKE '%penha%'
          OR lower(ur.neighborhood) LIKE '%tatuape%'
        THEN 'Leste'
        WHEN lower(ur.neighborhood) LIKE '%oeste%'
          OR lower(ur.neighborhood) LIKE '%lapa%'
          OR lower(ur.neighborhood) LIKE '%pinheiros%'
        THEN 'Oeste'
        ELSE 'Demais'
      END AS x,
      count(*)::int AS value
    FROM public.urban_reports ur, bounds b
    WHERE ur.created_at >= b.s AND ur.created_at <= b.e
    GROUP BY 1, 2
  ),
  heatmap AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object('x', h.x, 'y', h.y, 'value', h.value)
        ORDER BY h.x, h.y
      ),
      '[]'::jsonb
    ) AS hm
    FROM heatmap_cells h
  )
  SELECT jsonb_build_object(
    'range',
    jsonb_build_object('start', v_start, 'end', v_end),
    'kpis',
    (
      SELECT jsonb_build_object(
        'totalReports',
        jsonb_build_object(
          'current', k.total_reports_cur,
          'previous', k.total_reports_prev,
          'trendPct',
          CASE
            WHEN k.total_reports_prev > 0
            THEN round(
              100.0 * (k.total_reports_cur - k.total_reports_prev) / k.total_reports_prev,
              1
            )::numeric
            ELSE NULL
          END
        ),
        'positiveRate',
        jsonb_build_object(
          'current', k.positive_rate_cur,
          'previous', k.positive_rate_prev,
          'trendPct',
          CASE
            WHEN k.positive_rate_prev > 0
            THEN round((k.positive_rate_cur - k.positive_rate_prev)::numeric, 1)
            ELSE NULL
          END
        ),
        'criticalIssues',
        jsonb_build_object(
          'current', k.critical_cur,
          'previous', k.critical_prev,
          'trendPct',
          CASE
            WHEN k.critical_prev > 0
            THEN round(
              100.0 * (k.critical_cur - k.critical_prev) / k.critical_prev,
              1
            )::numeric
            ELSE NULL
          END
        ),
        'activeRegions',
        jsonb_build_object(
          'current', k.regions_cur,
          'previous', k.regions_prev,
          'trendPct',
          CASE
            WHEN k.regions_prev > 0
            THEN round(
              100.0 * (k.regions_cur - k.regions_prev) / k.regions_prev,
              1
            )::numeric
            ELSE NULL
          END
        )
      )
      FROM kpi k
    ),
    'time_series',
    (SELECT ts FROM time_series),
    'category_distribution',
    (SELECT cd FROM category_distribution),
    'heatmap',
    (SELECT hm FROM heatmap),
    'top_regions',
    (
      SELECT coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object('name', sub.n, 'value', sub.c)
            ORDER BY sub.c DESC
          )
          FROM (
            SELECT
              coalesce(nullif(btrim(ur.neighborhood), ''), 'Sem bairro') AS n,
              count(*)::int AS c
            FROM public.urban_reports ur, bounds b
            WHERE ur.created_at >= b.s AND ur.created_at <= b.e
            GROUP BY 1
            ORDER BY c DESC
            LIMIT 10
          ) sub
        ),
        '[]'::jsonb
      )
    )
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_analytics_dashboard_summary(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_analytics_dashboard_summary(timestamptz, timestamptz) TO authenticated;
