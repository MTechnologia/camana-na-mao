-- Drill-down demográfico: retorna relatos filtrados com a mesma regra do gráfico (SECURITY DEFINER).
-- O cliente não pode ler user_demographics de todos os usuários (RLS restritiva por padrão).

-- Staff pode ler demografia agregada (cruzamentos / drill no painel admin).
DROP POLICY IF EXISTS "Staff can view all user demographics" ON public.user_demographics;
CREATE POLICY "Staff can view all user demographics"
  ON public.user_demographics FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]));

CREATE OR REPLACE FUNCTION public.get_demographic_drill_reports(
  p_dimension TEXT,
  p_values TEXT[],
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.has_any_role(auth.uid(), ARRAY['gestor', 'admin']::public.app_role[]) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_dimension NOT IN ('gender', 'race', 'social_class', 'age_group') THEN
    RAISE EXCEPTION 'invalid dimension: %', p_dimension;
  END IF;

  IF p_values IS NULL OR array_length(p_values, 1) IS NULL THEN
    RAISE EXCEPTION 'p_values required';
  END IF;

  WITH filtered_urban AS (
    SELECT ur.*
    FROM urban_reports ur
    LEFT JOIN user_demographics ud ON ur.user_id = ud.user_id
    WHERE (p_start_date IS NULL OR ur.created_at >= p_start_date)
      AND (p_end_date IS NULL OR ur.created_at <= p_end_date + INTERVAL '1 day')
      AND (
        (p_dimension = 'gender' AND COALESCE(ud.gender, 'not_informed') = ANY(p_values))
        OR (p_dimension = 'race' AND COALESCE(ud.race, 'not_informed') = ANY(p_values))
        OR (p_dimension = 'social_class' AND COALESCE(ud.social_class, 'not_informed') = ANY(p_values))
        OR (
          p_dimension = 'age_group'
          AND (
            CASE
              WHEN ud.birth_date IS NULL THEN 'not_informed'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) < 18 THEN 'under_18'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
              ELSE '65_plus'
            END
          ) = ANY(p_values)
        )
      )
  ),
  filtered_transport AS (
    SELECT tr.*
    FROM transport_reports tr
    LEFT JOIN user_demographics ud ON tr.user_id = ud.user_id
    WHERE (p_start_date IS NULL OR tr.created_at >= p_start_date)
      AND (p_end_date IS NULL OR tr.created_at <= p_end_date + INTERVAL '1 day')
      AND (
        (p_dimension = 'gender' AND COALESCE(ud.gender, 'not_informed') = ANY(p_values))
        OR (p_dimension = 'race' AND COALESCE(ud.race, 'not_informed') = ANY(p_values))
        OR (p_dimension = 'social_class' AND COALESCE(ud.social_class, 'not_informed') = ANY(p_values))
        OR (
          p_dimension = 'age_group'
          AND (
            CASE
              WHEN ud.birth_date IS NULL THEN 'not_informed'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) < 18 THEN 'under_18'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
              ELSE '65_plus'
            END
          ) = ANY(p_values)
        )
      )
  ),
  filtered_evaluations AS (
    SELECT sr.id
    FROM service_ratings sr
    LEFT JOIN user_demographics ud ON sr.user_id = ud.user_id
    WHERE sr.publication_status = 'published'
      AND (p_start_date IS NULL OR sr.created_at >= p_start_date)
      AND (p_end_date IS NULL OR sr.created_at <= p_end_date + INTERVAL '1 day')
      AND (
        (p_dimension = 'gender' AND COALESCE(ud.gender, 'not_informed') = ANY(p_values))
        OR (p_dimension = 'race' AND COALESCE(ud.race, 'not_informed') = ANY(p_values))
        OR (p_dimension = 'social_class' AND COALESCE(ud.social_class, 'not_informed') = ANY(p_values))
        OR (
          p_dimension = 'age_group'
          AND (
            CASE
              WHEN ud.birth_date IS NULL THEN 'not_informed'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) < 18 THEN 'under_18'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
              WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
              ELSE '65_plus'
            END
          ) = ANY(p_values)
        )
      )
  )
  SELECT json_build_object(
    'urban',
    COALESCE(
      (SELECT json_agg(row_to_json(fu)) FROM filtered_urban fu),
      '[]'::json
    ),
    'transport',
    COALESCE(
      (SELECT json_agg(row_to_json(ft)) FROM filtered_transport ft),
      '[]'::json
    ),
    'evaluation_count',
    COALESCE((SELECT COUNT(*)::int FROM filtered_evaluations), 0)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_demographic_drill_reports(TEXT, TEXT[], TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated;
