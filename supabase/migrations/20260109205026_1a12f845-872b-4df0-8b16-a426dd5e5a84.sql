-- Drop ALL existing overloaded versions to eliminate ambiguity
DROP FUNCTION IF EXISTS public.get_reports_with_demographics(text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.get_reports_with_demographics(text, text, text, text, text, timestamptz, timestamptz);

-- Recreate a SINGLE function with TIMESTAMPTZ parameters
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
  v_demographics JSON;
  v_category_distribution JSON;
  v_neighborhood_distribution JSON;
  v_status_distribution JSON;
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

  -- Calculate counts from urban_reports
  WITH filtered_urban AS (
    SELECT ur.id, ur.severity, ur.status, ur.category, ur.neighborhood, ud.gender, ud.race, ud.social_class,
           CASE 
             WHEN ud.birth_date IS NULL THEN 'not_informed'
             WHEN DATE_PART('year', AGE(ud.birth_date)) < 18 THEN 'under_18'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
             ELSE '65_plus'
           END as age_group
    FROM urban_reports ur
    LEFT JOIN user_demographics ud ON ur.user_id = ud.user_id
    WHERE (p_report_type IS NULL OR p_report_type = 'urban')
      AND (p_start_date IS NULL OR ur.created_at >= p_start_date)
      AND (p_end_date IS NULL OR ur.created_at <= p_end_date + INTERVAL '1 day')
      AND (p_gender IS NULL OR p_gender = 'not_informed' AND ud.gender IS NULL OR ud.gender = p_gender)
      AND (p_race IS NULL OR p_race = 'not_informed' AND ud.race IS NULL OR ud.race = p_race)
      AND (p_social_class IS NULL OR p_social_class = 'not_informed' AND ud.social_class IS NULL OR ud.social_class = p_social_class)
      AND (p_age_group IS NULL OR p_age_group = 'not_informed' AND ud.birth_date IS NULL OR 
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
    SELECT tr.id, tr.severity, tr.status, tr.report_type as category, tr.location as neighborhood, ud.gender, ud.race, ud.social_class,
           CASE 
             WHEN ud.birth_date IS NULL THEN 'not_informed'
             WHEN DATE_PART('year', AGE(ud.birth_date)) < 18 THEN 'under_18'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
             WHEN DATE_PART('year', AGE(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
             ELSE '65_plus'
           END as age_group
    FROM transport_reports tr
    LEFT JOIN user_demographics ud ON tr.user_id = ud.user_id
    WHERE (p_report_type IS NULL OR p_report_type = 'transport')
      AND (p_start_date IS NULL OR tr.created_at >= p_start_date)
      AND (p_end_date IS NULL OR tr.created_at <= p_end_date + INTERVAL '1 day')
      AND (p_gender IS NULL OR p_gender = 'not_informed' AND ud.gender IS NULL OR ud.gender = p_gender)
      AND (p_race IS NULL OR p_race = 'not_informed' AND ud.race IS NULL OR ud.race = p_race)
      AND (p_social_class IS NULL OR p_social_class = 'not_informed' AND ud.social_class IS NULL OR ud.social_class = p_social_class)
      AND (p_age_group IS NULL OR p_age_group = 'not_informed' AND ud.birth_date IS NULL OR 
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
  combined AS (
    SELECT * FROM filtered_urban
    UNION ALL
    SELECT * FROM filtered_transport
  )
  SELECT 
    COUNT(*)::INT,
    COUNT(*) FILTER (WHERE severity = 'critical')::INT,
    COUNT(*) FILTER (WHERE status = 'pending')::INT,
    COUNT(*) FILTER (WHERE status = 'resolved')::INT
  INTO v_total, v_critical, v_pending, v_resolved
  FROM combined;

  -- Count by type
  SELECT COUNT(*)::INT INTO v_urban FROM filtered_urban;
  SELECT COUNT(*)::INT INTO v_transport FROM filtered_transport;

  -- Build demographics JSON
  WITH combined AS (
    SELECT * FROM filtered_urban
    UNION ALL
    SELECT * FROM filtered_transport
  )
  SELECT JSON_BUILD_OBJECT(
    'gender', (
      SELECT JSON_OBJECT_AGG(COALESCE(gender, 'Não informado'), cnt)
      FROM (SELECT gender, COUNT(*) as cnt FROM combined GROUP BY gender) g
    ),
    'race', (
      SELECT JSON_OBJECT_AGG(COALESCE(race, 'Não informado'), cnt)
      FROM (SELECT race, COUNT(*) as cnt FROM combined GROUP BY race) r
    ),
    'social_class', (
      SELECT JSON_OBJECT_AGG(COALESCE(social_class, 'Não informado'), cnt)
      FROM (SELECT social_class, COUNT(*) as cnt FROM combined GROUP BY social_class) s
    ),
    'age_group', (
      SELECT JSON_OBJECT_AGG(COALESCE(age_group, 'Não informado'), cnt)
      FROM (SELECT age_group, COUNT(*) as cnt FROM combined GROUP BY age_group) a
    )
  ) INTO v_demographics;

  -- Category distribution
  WITH combined AS (
    SELECT category FROM filtered_urban
    UNION ALL
    SELECT category FROM filtered_transport
  )
  SELECT JSON_AGG(JSON_BUILD_OBJECT('category', category, 'count', cnt))
  INTO v_category_distribution
  FROM (SELECT category, COUNT(*) as cnt FROM combined GROUP BY category ORDER BY cnt DESC) c;

  -- Neighborhood distribution
  WITH combined AS (
    SELECT neighborhood FROM filtered_urban
    UNION ALL
    SELECT neighborhood FROM filtered_transport
  )
  SELECT JSON_AGG(JSON_BUILD_OBJECT('neighborhood', neighborhood, 'count', cnt))
  INTO v_neighborhood_distribution
  FROM (SELECT neighborhood, COUNT(*) as cnt FROM combined WHERE neighborhood IS NOT NULL GROUP BY neighborhood ORDER BY cnt DESC LIMIT 10) n;

  -- Status distribution
  WITH combined AS (
    SELECT status FROM filtered_urban
    UNION ALL
    SELECT status FROM filtered_transport
  )
  SELECT JSON_AGG(JSON_BUILD_OBJECT('status', status, 'count', cnt))
  INTO v_status_distribution
  FROM (SELECT status, COUNT(*) as cnt FROM combined GROUP BY status ORDER BY cnt DESC) s;

  -- Build final result
  v_result := JSON_BUILD_OBJECT(
    'total', v_total,
    'critical_count', v_critical,
    'pending_count', v_pending,
    'resolved_count', v_resolved,
    'urban_count', v_urban,
    'transport_count', v_transport,
    'demographics', COALESCE(v_demographics, '{}'::JSON),
    'category_distribution', COALESCE(v_category_distribution, '[]'::JSON),
    'neighborhood_distribution', COALESCE(v_neighborhood_distribution, '[]'::JSON),
    'status_distribution', COALESCE(v_status_distribution, '[]'::JSON)
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_reports_with_demographics(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;