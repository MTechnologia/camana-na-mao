-- Drop and recreate the function with correct CTE usage
DROP FUNCTION IF EXISTS public.get_reports_with_demographics(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.get_reports_with_demographics(
  p_gender TEXT DEFAULT NULL,
  p_race TEXT DEFAULT NULL,
  p_social_class TEXT DEFAULT NULL,
  p_age_group TEXT DEFAULT NULL,
  p_report_type TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_roles TEXT[];
  v_result JSON;
  v_total INT := 0;
  v_critical INT := 0;
  v_pending INT := 0;
  v_resolved INT := 0;
  v_urban INT := 0;
  v_transport INT := 0;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  
  -- Get user roles
  SELECT ARRAY_AGG(role::TEXT) INTO v_user_roles
  FROM user_roles
  WHERE user_id = v_user_id;
  
  -- Check if user has admin or gestor role
  IF NOT (v_user_roles && ARRAY['admin', 'gestor']) THEN
    RAISE EXCEPTION 'Acesso negado: requer role admin ou gestor';
  END IF;

  -- Calculate counts using a single query with all CTEs
  WITH filtered_urban AS (
    SELECT ur.id, ur.severity, ur.status, ur.category, ur.neighborhood
    FROM urban_reports ur
    LEFT JOIN user_demographics ud ON ur.user_id = ud.user_id
    WHERE (p_report_type IS NULL OR p_report_type = 'urban')
      AND (p_start_date IS NULL OR ur.created_at >= p_start_date)
      AND (p_end_date IS NULL OR ur.created_at <= p_end_date + INTERVAL '1 day')
      AND (p_gender IS NULL OR (p_gender = 'not_informed' AND ud.gender IS NULL) OR ud.gender = p_gender)
      AND (p_race IS NULL OR (p_race = 'not_informed' AND ud.race IS NULL) OR ud.race = p_race)
      AND (p_social_class IS NULL OR (p_social_class = 'not_informed' AND ud.social_class IS NULL) OR ud.social_class = p_social_class)
      AND (p_age_group IS NULL OR (p_age_group = 'not_informed' AND ud.birth_date IS NULL) OR 
           (CASE 
             WHEN ud.birth_date IS NULL THEN 'not_informed'
             WHEN DATE_PART('year', AGE(ud.birth_date)) < 18 THEN 'under_18'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
             ELSE '65_plus'
           END) = p_age_group)
  ),
  filtered_transport AS (
    SELECT tr.id, tr.severity, tr.status, tr.report_type as category, tr.location as neighborhood
    FROM transport_reports tr
    LEFT JOIN user_demographics ud ON tr.user_id = ud.user_id
    WHERE (p_report_type IS NULL OR p_report_type = 'transport')
      AND (p_start_date IS NULL OR tr.created_at >= p_start_date)
      AND (p_end_date IS NULL OR tr.created_at <= p_end_date + INTERVAL '1 day')
      AND (p_gender IS NULL OR (p_gender = 'not_informed' AND ud.gender IS NULL) OR ud.gender = p_gender)
      AND (p_race IS NULL OR (p_race = 'not_informed' AND ud.race IS NULL) OR ud.race = p_race)
      AND (p_social_class IS NULL OR (p_social_class = 'not_informed' AND ud.social_class IS NULL) OR ud.social_class = p_social_class)
      AND (p_age_group IS NULL OR (p_age_group = 'not_informed' AND ud.birth_date IS NULL) OR 
           (CASE 
             WHEN ud.birth_date IS NULL THEN 'not_informed'
             WHEN DATE_PART('year', AGE(ud.birth_date)) < 18 THEN 'under_18'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
             ELSE '65_plus'
           END) = p_age_group)
  ),
  all_reports AS (
    SELECT id, severity, status, category, neighborhood, 'urban' as source FROM filtered_urban
    UNION ALL
    SELECT id, severity, status, category, neighborhood, 'transport' as source FROM filtered_transport
  ),
  stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE severity = 'high' OR severity = 'critical') as critical,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
      COUNT(*) FILTER (WHERE source = 'urban') as urban,
      COUNT(*) FILTER (WHERE source = 'transport') as transport
    FROM all_reports
  ),
  category_dist AS (
    SELECT json_agg(json_build_object('category', category, 'count', cnt)) as data
    FROM (SELECT category, COUNT(*) as cnt FROM all_reports GROUP BY category ORDER BY cnt DESC LIMIT 10) sub
  ),
  neighborhood_dist AS (
    SELECT json_agg(json_build_object('neighborhood', neighborhood, 'count', cnt)) as data
    FROM (SELECT neighborhood, COUNT(*) as cnt FROM all_reports WHERE neighborhood IS NOT NULL GROUP BY neighborhood ORDER BY cnt DESC LIMIT 10) sub
  ),
  status_dist AS (
    SELECT json_agg(json_build_object('status', status, 'count', cnt)) as data
    FROM (SELECT status, COUNT(*) as cnt FROM all_reports GROUP BY status) sub
  )
  SELECT json_build_object(
    'total', COALESCE(s.total, 0),
    'critical', COALESCE(s.critical, 0),
    'pending', COALESCE(s.pending, 0),
    'resolved', COALESCE(s.resolved, 0),
    'urban', COALESCE(s.urban, 0),
    'transport', COALESCE(s.transport, 0),
    'categoryDistribution', COALESCE(cd.data, '[]'::json),
    'neighborhoodDistribution', COALESCE(nd.data, '[]'::json),
    'statusDistribution', COALESCE(sd.data, '[]'::json)
  ) INTO v_result
  FROM stats s
  CROSS JOIN category_dist cd
  CROSS JOIN neighborhood_dist nd
  CROSS JOIN status_dist sd;

  RETURN COALESCE(v_result, '{}'::json);
END;
$$;