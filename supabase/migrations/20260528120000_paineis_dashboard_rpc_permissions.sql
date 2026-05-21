-- Painéis personalizáveis (/paineis): libera RPCs para gestor, admin, assessor, vereador
-- e quem tiver analytics.view_advanced (HU-11).

CREATE OR REPLACE FUNCTION public.can_access_analytics_paineis(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
    AND (
      public.has_any_role(
        _user_id,
        ARRAY['admin', 'gestor', 'assessor', 'vereador', 'cidadao_engajado']::public.app_role[]
      )
      OR public.has_permission(_user_id, 'analytics.view_advanced')
    );
$$;

COMMENT ON FUNCTION public.can_access_analytics_paineis(uuid) IS
  'HU-5 / painéis: quem pode chamar RPCs de resumo do dashboard analítico.';

-- Vereador no catálogo TS já tem analytics.view_advanced; alinha seed do banco.
INSERT INTO public.role_permissions (role, permission_key)
VALUES ('vereador', 'analytics.view_advanced')
ON CONFLICT (role, permission_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- get_analytics_dashboard_summary
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
  IF NOT public.can_access_analytics_paineis(auth.uid()) THEN
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

-- ---------------------------------------------------------------------------
-- get_worst_services_by_dimension
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
  IF NOT public.can_access_analytics_paineis(auth.uid()) THEN
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

-- Presets de tema/layout: assessor e vereador também podem salvar painéis.
DROP POLICY IF EXISTS "Admin lê próprios presets" ON public.admin_dashboard_presets;
CREATE POLICY "Admin lê próprios presets"
  ON public.admin_dashboard_presets
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND public.can_access_analytics_paineis(auth.uid())
  );

DROP POLICY IF EXISTS "Admin cria próprios presets" ON public.admin_dashboard_presets;
CREATE POLICY "Admin cria próprios presets"
  ON public.admin_dashboard_presets
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_access_analytics_paineis(auth.uid())
  );

DROP POLICY IF EXISTS "Admin atualiza próprios presets" ON public.admin_dashboard_presets;
CREATE POLICY "Admin atualiza próprios presets"
  ON public.admin_dashboard_presets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_access_analytics_paineis(auth.uid())
  );

DROP POLICY IF EXISTS "Admin remove próprios presets" ON public.admin_dashboard_presets;
CREATE POLICY "Admin remove próprios presets"
  ON public.admin_dashboard_presets
  FOR DELETE
  USING (auth.uid() = user_id);

GRANT EXECUTE ON FUNCTION public.can_access_analytics_paineis(uuid) TO authenticated;
