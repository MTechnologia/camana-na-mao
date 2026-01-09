-- Função segura para admins/gestores acessarem dados demográficos agregados
-- Usa SECURITY DEFINER para bypassar RLS de forma controlada

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
  v_is_admin BOOLEAN := FALSE;
  v_result JSON;
BEGIN
  -- Obter ID do usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  
  -- Verificar se é admin ou gestor
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = v_user_id 
    AND role IN ('admin', 'gestor')
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Acesso negado: requer permissão de admin ou gestor';
  END IF;
  
  -- Construir resultado com dados demográficos
  WITH urban_with_demo AS (
    SELECT 
      ur.id,
      ur.user_id,
      ur.category,
      ur.subcategory_label,
      ur.neighborhood,
      ur.severity,
      ur.risk_level,
      ur.status,
      ur.created_at,
      'urban' as report_source,
      ud.gender,
      ud.race,
      ud.social_class,
      CASE 
        WHEN ud.birth_date IS NULL THEN NULL
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) < 18 THEN 'under_18'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
        ELSE '65_plus'
      END as age_group
    FROM urban_reports ur
    LEFT JOIN user_demographics ud ON ur.user_id = ud.user_id
    WHERE 
      (p_start_date IS NULL OR ur.created_at >= p_start_date)
      AND (p_end_date IS NULL OR ur.created_at <= p_end_date)
  ),
  transport_with_demo AS (
    SELECT 
      tr.id,
      tr.user_id,
      tr.report_type as category,
      tr.subcategory_label,
      tr.location as neighborhood,
      tr.severity,
      NULL as risk_level,
      tr.status,
      tr.created_at,
      'transport' as report_source,
      ud.gender,
      ud.race,
      ud.social_class,
      CASE 
        WHEN ud.birth_date IS NULL THEN NULL
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) < 18 THEN 'under_18'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
        ELSE '65_plus'
      END as age_group
    FROM transport_reports tr
    LEFT JOIN user_demographics ud ON tr.user_id = ud.user_id
    WHERE 
      (p_start_date IS NULL OR tr.created_at >= p_start_date)
      AND (p_end_date IS NULL OR tr.created_at <= p_end_date)
  ),
  all_reports AS (
    SELECT * FROM urban_with_demo
    UNION ALL
    SELECT * FROM transport_with_demo
  ),
  filtered_reports AS (
    SELECT * FROM all_reports
    WHERE
      (p_gender IS NULL OR gender = p_gender OR (p_gender = 'not_informed' AND gender IS NULL))
      AND (p_race IS NULL OR race = p_race OR (p_race = 'not_informed' AND race IS NULL))
      AND (p_social_class IS NULL OR social_class = p_social_class OR (p_social_class = 'not_informed' AND social_class IS NULL))
      AND (p_age_group IS NULL OR age_group = p_age_group OR (p_age_group = 'not_informed' AND age_group IS NULL))
      AND (p_report_type IS NULL OR report_source = p_report_type)
  ),
  stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE severity = 'critical' OR risk_level = 'critical') as critical_count,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
      COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
      -- Distribuição por gênero
      COUNT(*) FILTER (WHERE gender = 'masculino') as gender_male,
      COUNT(*) FILTER (WHERE gender = 'feminino') as gender_female,
      COUNT(*) FILTER (WHERE gender = 'outro') as gender_other,
      COUNT(*) FILTER (WHERE gender = 'prefiro_nao_dizer') as gender_prefer_not_say,
      COUNT(*) FILTER (WHERE gender IS NULL) as gender_not_informed,
      -- Distribuição por raça
      COUNT(*) FILTER (WHERE race = 'branca') as race_white,
      COUNT(*) FILTER (WHERE race = 'preta') as race_black,
      COUNT(*) FILTER (WHERE race = 'parda') as race_brown,
      COUNT(*) FILTER (WHERE race = 'amarela') as race_yellow,
      COUNT(*) FILTER (WHERE race = 'indigena') as race_indigenous,
      COUNT(*) FILTER (WHERE race IS NULL) as race_not_informed,
      -- Distribuição por classe social
      COUNT(*) FILTER (WHERE social_class = 'A') as class_a,
      COUNT(*) FILTER (WHERE social_class = 'B') as class_b,
      COUNT(*) FILTER (WHERE social_class = 'C') as class_c,
      COUNT(*) FILTER (WHERE social_class = 'D') as class_d,
      COUNT(*) FILTER (WHERE social_class = 'E') as class_e,
      COUNT(*) FILTER (WHERE social_class IS NULL) as class_not_informed,
      -- Distribuição por faixa etária
      COUNT(*) FILTER (WHERE age_group = 'under_18') as age_under_18,
      COUNT(*) FILTER (WHERE age_group = '18_24') as age_18_24,
      COUNT(*) FILTER (WHERE age_group = '25_34') as age_25_34,
      COUNT(*) FILTER (WHERE age_group = '35_44') as age_35_44,
      COUNT(*) FILTER (WHERE age_group = '45_54') as age_45_54,
      COUNT(*) FILTER (WHERE age_group = '55_64') as age_55_64,
      COUNT(*) FILTER (WHERE age_group = '65_plus') as age_65_plus,
      COUNT(*) FILTER (WHERE age_group IS NULL) as age_not_informed,
      -- Por fonte
      COUNT(*) FILTER (WHERE report_source = 'urban') as urban_count,
      COUNT(*) FILTER (WHERE report_source = 'transport') as transport_count,
      -- Distribuição por categoria (top 10)
      (SELECT json_agg(cat_row) FROM (
        SELECT category, COUNT(*) as count
        FROM filtered_reports
        GROUP BY category
        ORDER BY count DESC
        LIMIT 10
      ) cat_row) as category_distribution,
      -- Distribuição por bairro (top 10)
      (SELECT json_agg(nb_row) FROM (
        SELECT neighborhood, COUNT(*) as count
        FROM filtered_reports
        WHERE neighborhood IS NOT NULL
        GROUP BY neighborhood
        ORDER BY count DESC
        LIMIT 10
      ) nb_row) as neighborhood_distribution,
      -- Por status
      (SELECT json_agg(st_row) FROM (
        SELECT status, COUNT(*) as count
        FROM filtered_reports
        GROUP BY status
      ) st_row) as status_distribution
    FROM filtered_reports
  )
  SELECT json_build_object(
    'total', total,
    'critical_count', critical_count,
    'pending_count', pending_count,
    'resolved_count', resolved_count,
    'urban_count', urban_count,
    'transport_count', transport_count,
    'demographics', json_build_object(
      'gender', json_build_object(
        'masculino', gender_male,
        'feminino', gender_female,
        'outro', gender_other,
        'prefiro_nao_dizer', gender_prefer_not_say,
        'not_informed', gender_not_informed
      ),
      'race', json_build_object(
        'branca', race_white,
        'preta', race_black,
        'parda', race_brown,
        'amarela', race_yellow,
        'indigena', race_indigenous,
        'not_informed', race_not_informed
      ),
      'social_class', json_build_object(
        'A', class_a,
        'B', class_b,
        'C', class_c,
        'D', class_d,
        'E', class_e,
        'not_informed', class_not_informed
      ),
      'age_group', json_build_object(
        'under_18', age_under_18,
        '18_24', age_18_24,
        '25_34', age_25_34,
        '35_44', age_35_44,
        '45_54', age_45_54,
        '55_64', age_55_64,
        '65_plus', age_65_plus,
        'not_informed', age_not_informed
      )
    ),
    'category_distribution', category_distribution,
    'neighborhood_distribution', neighborhood_distribution,
    'status_distribution', status_distribution
  ) INTO v_result
  FROM stats;
  
  RETURN v_result;
END;
$$;

-- Permitir que usuários autenticados chamem a função
-- (a validação de role é feita internamente)
GRANT EXECUTE ON FUNCTION public.get_reports_with_demographics TO authenticated;