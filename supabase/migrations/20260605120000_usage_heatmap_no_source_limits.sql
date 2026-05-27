-- HU-4.1: heatmap de uso sem limite de registros de origem.
--
-- A tela consumia service_visits e transport_reports diretamente no front-end
-- com .limit(5000). Esta RPC move a agregacao para o banco: todos os registros
-- do periodo participam do calculo, e o navegador recebe apenas celulas finais.

CREATE INDEX IF NOT EXISTS idx_service_visits_usage_heatmap_created_service
  ON public.service_visits (created_at, service_id)
  WHERE created_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transport_reports_usage_heatmap_created
  ON public.transport_reports (created_at)
  WHERE created_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_usage_heatmap_data(
  p_type text DEFAULT 'all_usage',
  p_period text DEFAULT '30d'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_type text := lower(COALESCE(NULLIF(p_type, ''), 'all_usage'));
  result json;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[])
    OR public.has_permission(auth.uid(), 'analytics.view_advanced')
  ) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF v_type NOT IN ('all', 'all_usage', 'all_reports', 'urban', 'evaluation', 'visits', 'transport') THEN
    v_type := 'all_usage';
  END IF;

  CASE COALESCE(p_period, '30d')
    WHEN '7d' THEN v_start := now() - interval '7 days';
    WHEN '30d' THEN v_start := now() - interval '30 days';
    WHEN '90d' THEN v_start := now() - interval '90 days';
    WHEN '12m' THEN v_start := now() - interval '12 months';
    ELSE v_start := now() - interval '30 days';
  END CASE;

  WITH
  urban_agg AS (
    SELECT
      round(ur.latitude::numeric, 4) AS lat_r,
      round(ur.longitude::numeric, 4) AS lng_r,
      count(*)::bigint AS weight
    FROM public.urban_reports ur
    WHERE v_type IN ('all', 'all_usage', 'all_reports', 'urban')
      AND ur.latitude IS NOT NULL
      AND ur.longitude IS NOT NULL
      AND ur.latitude BETWEEN -23.90 AND -23.30
      AND ur.longitude BETWEEN -46.85 AND -46.36
      AND abs(ur.latitude) > 0.02
      AND abs(ur.longitude) > 0.02
      AND ur.created_at IS NOT NULL
      AND ur.created_at >= v_start
    GROUP BY 1, 2
  ),
  evaluation_agg AS (
    SELECT
      round(ps.latitude::numeric, 4) AS lat_r,
      round(ps.longitude::numeric, 4) AS lng_r,
      count(*)::bigint AS weight
    FROM public.service_ratings sr
    INNER JOIN public.public_services ps ON ps.id = sr.service_id
    WHERE v_type IN ('all', 'all_usage', 'all_reports', 'evaluation')
      AND sr.publication_status = 'published'
      AND sr.created_at IS NOT NULL
      AND sr.created_at >= v_start
      AND ps.latitude BETWEEN -23.90 AND -23.30
      AND ps.longitude BETWEEN -46.85 AND -46.36
    GROUP BY 1, 2
  ),
  visits_agg AS (
    SELECT
      round(ps.latitude::numeric, 4) AS lat_r,
      round(ps.longitude::numeric, 4) AS lng_r,
      count(*)::bigint AS weight
    FROM public.service_visits sv
    INNER JOIN public.public_services ps ON ps.id = sv.service_id
    WHERE v_type IN ('all', 'all_usage', 'visits')
      AND sv.created_at IS NOT NULL
      AND sv.created_at >= v_start
      AND ps.latitude BETWEEN -23.90 AND -23.30
      AND ps.longitude BETWEEN -46.85 AND -46.36
    GROUP BY 1, 2
  ),
  transport_normalized AS (
    SELECT
      ' ' || translate(
        lower(
          COALESCE(tr.location, '') || ' ' ||
          COALESCE(tr.stop_location, '') || ' ' ||
          COALESCE(tr.stop_name, '')
        ),
        U&'\00E1\00E0\00E2\00E3\00E4\00E9\00E8\00EA\00EB\00ED\00EC\00EE\00EF\00F3\00F2\00F4\00F5\00F6\00FA\00F9\00FB\00FC\00E7',
        'aaaaaeeeeiiiiooooouuuuc'
      ) || ' ' AS text_norm
    FROM public.transport_reports tr
    WHERE v_type IN ('all', 'all_usage', 'transport')
      AND tr.created_at IS NOT NULL
      AND tr.created_at >= v_start
  ),
  transport_zone AS (
    SELECT
      CASE
        WHEN text_norm LIKE ANY (ARRAY[
          '%tucuruvi%', '%jacana%', '%santana%', '%vila maria%', '%vila guilherme%',
          '%casa verde%', '%limao%', '%brasilandia%', '%freguesia do o%',
          '%perus%', '%pirituba%', '%vila leopoldina%'
        ]) THEN 'Zona Norte'
        WHEN text_norm LIKE ANY (ARRAY[
          '%ipiranga%', '%jabaquara%', '%santo amaro%', '%cidade ademar%',
          '%socorro%', '%cursino%', '%saude%', '%vila mariana%', '%campo belo%'
        ]) THEN 'Zona Sul'
        WHEN text_norm LIKE ANY (ARRAY[
          '%mooca%', '%tatuape%', '%vila carmosina%', '%vila formosa%', '%penha%',
          '%cangaiba%', '%jardim santa helena%', '%sao mateus%', '%itaquera%',
          '%guaianases%', '%vila prudente%', '%eletropaulo%', '%arena corinthians%'
        ]) THEN 'Zona Leste'
        WHEN text_norm LIKE ANY (ARRAY[
          '%lapa%', '%pinheiros%', '%butanta%', '%jaguare%', '%rio pequeno%',
          '%raposo tavares%', '%vila sonia%', '%morumbi%', '%barra funda%',
          '%jardim everest%', '%brooklin%', '%vila olimpia%', '%vila andrade%',
          '%vila gomes%', '%vl gomes%'
        ]) THEN 'Zona Oeste'
        WHEN text_norm LIKE ANY (ARRAY[
          '% se %', '%republica%', '%bela vista%', '%bom retiro%', '%cambuci%',
          '%consolacao%', '%liberdade%', '%santa cecilia%', '%prestes maia%',
          '%auditorio%', '%camara municipal%', '%distrital centro%', '%centro%',
          '%vila buarque%', '%aclimacao%', '%higienopolis%'
        ]) THEN 'Centro'
        ELSE NULL
      END AS zone
    FROM transport_normalized
  ),
  transport_agg AS (
    SELECT
      CASE zone
        WHEN 'Centro' THEN -23.5475
        WHEN 'Zona Norte' THEN -23.4814
        WHEN 'Zona Sul' THEN -23.6489
        WHEN 'Zona Leste' THEN -23.5505
        WHEN 'Zona Oeste' THEN -23.5705
      END::numeric AS lat_r,
      CASE zone
        WHEN 'Centro' THEN -46.6361
        WHEN 'Zona Norte' THEN -46.6308
        WHEN 'Zona Sul' THEN -46.7000
        WHEN 'Zona Leste' THEN -46.4861
        WHEN 'Zona Oeste' THEN -46.7286
      END::numeric AS lng_r,
      count(*)::bigint AS weight
    FROM transport_zone
    WHERE zone IS NOT NULL
    GROUP BY zone
  ),
  source_cells AS (
    SELECT 'urban'::text AS source, lat_r, lng_r, weight FROM urban_agg
    UNION ALL
    SELECT 'evaluation'::text AS source, lat_r, lng_r, weight FROM evaluation_agg
    UNION ALL
    SELECT 'visits'::text AS source, lat_r, lng_r, weight FROM visits_agg
    UNION ALL
    SELECT 'transport'::text AS source, lat_r, lng_r, weight FROM transport_agg
  ),
  rolled AS (
    SELECT lat_r, lng_r, sum(weight)::bigint AS weight
    FROM source_cells
    GROUP BY lat_r, lng_r
  )
  SELECT json_build_object(
    'period', COALESCE(p_period, '30d'),
    'start_at', v_start,
    'points', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'lat', lat_r::float8,
            'lng', lng_r::float8,
            'weight', weight
          )
          ORDER BY weight DESC, lat_r, lng_r
        )
        FROM rolled
      ),
      '[]'::json
    ),
    'truncated', false,
    'breakdown', json_build_object(
      'urban', (SELECT count(*)::int FROM urban_agg),
      'evaluation', (SELECT count(*)::int FROM evaluation_agg),
      'visits', (SELECT count(*)::int FROM visits_agg),
      'transport', (SELECT count(*)::int FROM transport_agg)
    )
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_usage_heatmap_data(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_usage_heatmap_data(text, text) TO authenticated;
