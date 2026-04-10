-- Demographics: contar apenas avaliações com publicação aprovada (alinhado à moderação)

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
  result JSON;
BEGIN
  WITH filtered_urban AS (
    SELECT 
      ur.id,
      ur.severity,
      ur.status,
      ur.category,
      ur.neighborhood,
      ur.created_at,
      ur.user_id,
      'urban' as source
    FROM urban_reports ur
    LEFT JOIN user_demographics ud ON ur.user_id = ud.user_id
    WHERE (p_report_type IS NULL OR p_report_type = 'urban')
      AND (p_start_date IS NULL OR ur.created_at >= p_start_date)
      AND (p_end_date IS NULL OR ur.created_at <= p_end_date + INTERVAL '1 day')
      AND (p_gender IS NULL OR COALESCE(ud.gender, 'not_informed') = p_gender)
      AND (p_race IS NULL OR COALESCE(ud.race, 'not_informed') = p_race)
      AND (p_social_class IS NULL OR COALESCE(ud.social_class, 'not_informed') = p_social_class)
      AND (p_age_group IS NULL OR (
        CASE 
          WHEN ud.birth_date IS NULL THEN 'not_informed'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) < 18 THEN 'under_18'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
          ELSE '65_plus'
        END = p_age_group
      ))
  ),
  filtered_transport AS (
    SELECT 
      tr.id,
      tr.severity,
      tr.status,
      tr.report_type as category,
      tr.location as neighborhood,
      tr.created_at,
      tr.user_id,
      'transport' as source
    FROM transport_reports tr
    LEFT JOIN user_demographics ud ON tr.user_id = ud.user_id
    WHERE (p_report_type IS NULL OR p_report_type = 'transport')
      AND (p_start_date IS NULL OR tr.created_at >= p_start_date)
      AND (p_end_date IS NULL OR tr.created_at <= p_end_date + INTERVAL '1 day')
      AND (p_gender IS NULL OR COALESCE(ud.gender, 'not_informed') = p_gender)
      AND (p_race IS NULL OR COALESCE(ud.race, 'not_informed') = p_race)
      AND (p_social_class IS NULL OR COALESCE(ud.social_class, 'not_informed') = p_social_class)
      AND (p_age_group IS NULL OR (
        CASE 
          WHEN ud.birth_date IS NULL THEN 'not_informed'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) < 18 THEN 'under_18'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
          ELSE '65_plus'
        END = p_age_group
      ))
  ),
  filtered_evaluations AS (
    SELECT 
      sr.id,
      'medium'::text as severity,
      CASE 
        WHEN sr.rating_stars >= 4 THEN 'resolved'
        WHEN sr.rating_stars <= 2 THEN 'pending'
        ELSE 'in_progress'
      END as status,
      COALESCE(ps.service_type::text, 'ubs') as category,
      ps.district as neighborhood,
      sr.created_at,
      sr.user_id,
      'evaluation' as source
    FROM service_ratings sr
    LEFT JOIN public_services ps ON sr.service_id = ps.id
    LEFT JOIN user_demographics ud ON sr.user_id = ud.user_id
    WHERE sr.publication_status = 'published'
      AND (p_report_type IS NULL OR p_report_type = 'evaluation')
      AND (p_start_date IS NULL OR sr.created_at >= p_start_date)
      AND (p_end_date IS NULL OR sr.created_at <= p_end_date + INTERVAL '1 day')
      AND (p_gender IS NULL OR COALESCE(ud.gender, 'not_informed') = p_gender)
      AND (p_race IS NULL OR COALESCE(ud.race, 'not_informed') = p_race)
      AND (p_social_class IS NULL OR COALESCE(ud.social_class, 'not_informed') = p_social_class)
      AND (p_age_group IS NULL OR (
        CASE 
          WHEN ud.birth_date IS NULL THEN 'not_informed'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) < 18 THEN 'under_18'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
          ELSE '65_plus'
        END = p_age_group
      ))
  ),
  all_reports AS (
    SELECT id, severity, status, category, neighborhood, created_at, user_id, source FROM filtered_urban
    UNION ALL
    SELECT id, severity, status, category, neighborhood, created_at, user_id, source FROM filtered_transport
    UNION ALL
    SELECT id, severity, status, category, neighborhood, created_at, user_id, source FROM filtered_evaluations
  ),
  stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE source = 'urban') as urban,
      COUNT(*) FILTER (WHERE source = 'transport') as transport,
      COUNT(*) FILTER (WHERE source = 'evaluation') as evaluation,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
      COUNT(*) FILTER (WHERE severity = 'critical') as critical
    FROM all_reports
  ),
  category_dist AS (
    SELECT category, COUNT(*) as count
    FROM all_reports
    WHERE category IS NOT NULL
    GROUP BY category
    ORDER BY count DESC
  ),
  neighborhood_dist AS (
    SELECT neighborhood, COUNT(*) as count
    FROM all_reports
    WHERE neighborhood IS NOT NULL
    GROUP BY neighborhood
    ORDER BY count DESC
    LIMIT 20
  ),
  status_dist AS (
    SELECT status, COUNT(*) as count
    FROM all_reports
    GROUP BY status
  ),
  demographics_agg AS (
    SELECT 
      ar.user_id,
      COALESCE(ud.gender, 'not_informed') as gender,
      COALESCE(ud.race, 'not_informed') as race,
      COALESCE(ud.social_class, 'not_informed') as social_class,
      CASE 
        WHEN ud.birth_date IS NULL THEN 'not_informed'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) < 18 THEN 'under_18'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
        ELSE '65_plus'
      END as age_group
    FROM all_reports ar
    LEFT JOIN user_demographics ud ON ar.user_id = ud.user_id
  )
  SELECT json_build_object(
    'total', COALESCE(s.total, 0),
    'urban_count', COALESCE(s.urban, 0),
    'transport_count', COALESCE(s.transport, 0),
    'evaluation_count', COALESCE(s.evaluation, 0),
    'pending_count', COALESCE(s.pending, 0),
    'resolved_count', COALESCE(s.resolved, 0),
    'critical_count', COALESCE(s.critical, 0),
    'category_distribution', COALESCE((SELECT json_agg(json_build_object('category', category, 'count', count)) FROM category_dist), '[]'::json),
    'neighborhood_distribution', COALESCE((SELECT json_agg(json_build_object('neighborhood', neighborhood, 'count', count)) FROM neighborhood_dist), '[]'::json),
    'status_distribution', COALESCE((SELECT json_agg(json_build_object('status', status, 'count', count)) FROM status_dist), '[]'::json),
    'demographics', json_build_object(
      'gender', COALESCE((SELECT json_object_agg(gender, cnt) FROM (SELECT gender, COUNT(*) as cnt FROM demographics_agg GROUP BY gender) g), '{}'::json),
      'race', COALESCE((SELECT json_object_agg(race, cnt) FROM (SELECT race, COUNT(*) as cnt FROM demographics_agg GROUP BY race) r), '{}'::json),
      'social_class', COALESCE((SELECT json_object_agg(social_class, cnt) FROM (SELECT social_class, COUNT(*) as cnt FROM demographics_agg GROUP BY social_class) sc), '{}'::json),
      'age_group', COALESCE((SELECT json_object_agg(age_group, cnt) FROM (SELECT age_group, COUNT(*) as cnt FROM demographics_agg GROUP BY age_group) ag), '{}'::json)
    )
  ) INTO result
  FROM stats s;

  RETURN result;
END;
$$;
