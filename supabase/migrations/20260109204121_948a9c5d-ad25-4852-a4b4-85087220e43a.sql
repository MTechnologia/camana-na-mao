-- Corrige a função get_reports_with_demographics
-- Problema: subcategory_label não existe, usar subcategory para urban_reports e NULL para transport_reports

CREATE OR REPLACE FUNCTION public.get_reports_with_demographics(
  p_gender TEXT DEFAULT NULL,
  p_race TEXT DEFAULT NULL,
  p_social_class TEXT DEFAULT NULL,
  p_age_group TEXT DEFAULT NULL,
  p_report_type TEXT DEFAULT NULL,
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  user_roles TEXT[];
BEGIN
  -- Verificar se o usuário tem permissão (admin ou gestor)
  SELECT ARRAY_AGG(role::TEXT) INTO user_roles
  FROM user_roles
  WHERE user_id = auth.uid();
  
  IF NOT (user_roles && ARRAY['admin', 'gestor']) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores e gestores podem acessar dados demográficos';
  END IF;

  WITH all_reports AS (
    -- Urban reports
    SELECT 
      ur.id,
      ur.user_id,
      ur.created_at,
      ur.category,
      ur.subcategory,  -- CORRIGIDO: era subcategory_label
      ur.severity,
      ur.status,
      ur.neighborhood,
      'urban' as report_type,
      ud.gender,
      ud.race,
      ud.social_class,
      ud.birth_date
    FROM urban_reports ur
    LEFT JOIN user_demographics ud ON ur.user_id = ud.user_id
    WHERE 
      (p_start_date IS NULL OR ur.created_at >= p_start_date::timestamp)
      AND (p_end_date IS NULL OR ur.created_at <= (p_end_date::timestamp + interval '1 day'))
    
    UNION ALL
    
    -- Transport reports
    SELECT 
      tr.id,
      tr.user_id,
      tr.created_at,
      tr.report_type as category,
      NULL as subcategory,  -- CORRIGIDO: transport_reports não tem subcategory
      tr.severity,
      tr.status,
      tr.location as neighborhood,
      'transport' as report_type,
      ud.gender,
      ud.race,
      ud.social_class,
      ud.birth_date
    FROM transport_reports tr
    LEFT JOIN user_demographics ud ON tr.user_id = ud.user_id
    WHERE 
      (p_start_date IS NULL OR tr.created_at >= p_start_date::timestamp)
      AND (p_end_date IS NULL OR tr.created_at <= (p_end_date::timestamp + interval '1 day'))
  ),
  filtered_reports AS (
    SELECT *
    FROM all_reports
    WHERE
      (p_gender IS NULL OR gender = p_gender OR (p_gender = 'not_informed' AND gender IS NULL))
      AND (p_race IS NULL OR race = p_race OR (p_race = 'not_informed' AND race IS NULL))
      AND (p_social_class IS NULL OR social_class = p_social_class OR (p_social_class = 'not_informed' AND social_class IS NULL))
      AND (p_report_type IS NULL OR report_type = p_report_type)
      AND (
        p_age_group IS NULL 
        OR (p_age_group = 'not_informed' AND birth_date IS NULL)
        OR (p_age_group = '18-24' AND birth_date IS NOT NULL AND EXTRACT(YEAR FROM AGE(birth_date::date)) BETWEEN 18 AND 24)
        OR (p_age_group = '25-34' AND birth_date IS NOT NULL AND EXTRACT(YEAR FROM AGE(birth_date::date)) BETWEEN 25 AND 34)
        OR (p_age_group = '35-44' AND birth_date IS NOT NULL AND EXTRACT(YEAR FROM AGE(birth_date::date)) BETWEEN 35 AND 44)
        OR (p_age_group = '45-54' AND birth_date IS NOT NULL AND EXTRACT(YEAR FROM AGE(birth_date::date)) BETWEEN 45 AND 54)
        OR (p_age_group = '55-64' AND birth_date IS NOT NULL AND EXTRACT(YEAR FROM AGE(birth_date::date)) BETWEEN 55 AND 64)
        OR (p_age_group = '65+' AND birth_date IS NOT NULL AND EXTRACT(YEAR FROM AGE(birth_date::date)) >= 65)
      )
  )
  SELECT json_build_object(
    'total', (SELECT COUNT(*) FROM filtered_reports),
    'urban_count', (SELECT COUNT(*) FROM filtered_reports WHERE report_type = 'urban'),
    'transport_count', (SELECT COUNT(*) FROM filtered_reports WHERE report_type = 'transport'),
    'critical_count', (SELECT COUNT(*) FROM filtered_reports WHERE severity IN ('critical', 'alta', 'urgente')),
    'pending_count', (SELECT COUNT(*) FROM filtered_reports WHERE status IN ('pending', 'pendente', 'novo')),
    'resolved_count', (SELECT COUNT(*) FROM filtered_reports WHERE status IN ('resolved', 'resolvido', 'concluido')),
    'gender_distribution', (
      SELECT json_agg(json_build_object('name', COALESCE(gender, 'not_informed'), 'value', cnt))
      FROM (
        SELECT COALESCE(gender, 'not_informed') as gender, COUNT(*) as cnt
        FROM filtered_reports
        GROUP BY COALESCE(gender, 'not_informed')
      ) g
    ),
    'race_distribution', (
      SELECT json_agg(json_build_object('name', COALESCE(race, 'not_informed'), 'value', cnt))
      FROM (
        SELECT COALESCE(race, 'not_informed') as race, COUNT(*) as cnt
        FROM filtered_reports
        GROUP BY COALESCE(race, 'not_informed')
      ) r
    ),
    'social_class_distribution', (
      SELECT json_agg(json_build_object('name', COALESCE(social_class, 'not_informed'), 'value', cnt))
      FROM (
        SELECT COALESCE(social_class, 'not_informed') as social_class, COUNT(*) as cnt
        FROM filtered_reports
        GROUP BY COALESCE(social_class, 'not_informed')
      ) s
    ),
    'age_group_distribution', (
      SELECT json_agg(json_build_object('name', age_group, 'value', cnt))
      FROM (
        SELECT 
          CASE 
            WHEN birth_date IS NULL THEN 'not_informed'
            WHEN EXTRACT(YEAR FROM AGE(birth_date::date)) BETWEEN 18 AND 24 THEN '18-24'
            WHEN EXTRACT(YEAR FROM AGE(birth_date::date)) BETWEEN 25 AND 34 THEN '25-34'
            WHEN EXTRACT(YEAR FROM AGE(birth_date::date)) BETWEEN 35 AND 44 THEN '35-44'
            WHEN EXTRACT(YEAR FROM AGE(birth_date::date)) BETWEEN 45 AND 54 THEN '45-54'
            WHEN EXTRACT(YEAR FROM AGE(birth_date::date)) BETWEEN 55 AND 64 THEN '55-64'
            ELSE '65+'
          END as age_group,
          COUNT(*) as cnt
        FROM filtered_reports
        GROUP BY age_group
      ) a
    ),
    'category_distribution', (
      SELECT json_agg(json_build_object('name', category, 'value', cnt))
      FROM (
        SELECT category, COUNT(*) as cnt
        FROM filtered_reports
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY cnt DESC
        LIMIT 10
      ) c
    ),
    'neighborhood_distribution', (
      SELECT json_agg(json_build_object('name', neighborhood, 'value', cnt))
      FROM (
        SELECT neighborhood, COUNT(*) as cnt
        FROM filtered_reports
        WHERE neighborhood IS NOT NULL
        GROUP BY neighborhood
        ORDER BY cnt DESC
        LIMIT 10
      ) n
    ),
    'status_distribution', (
      SELECT json_agg(json_build_object('name', status, 'value', cnt))
      FROM (
        SELECT COALESCE(status, 'pending') as status, COUNT(*) as cnt
        FROM filtered_reports
        GROUP BY COALESCE(status, 'pending')
      ) st
    )
  ) INTO result;
  
  RETURN result;
END;
$$;