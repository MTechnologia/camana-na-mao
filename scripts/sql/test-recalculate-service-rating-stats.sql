-- Teste SQL (transacional) para validar RN-AVA-006:
-- média e contagem do serviço são recalculadas automaticamente após INSERT publicado.
--
-- Execução (PowerShell):
--   psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f .\scripts\sql\test-recalculate-service-rating-stats.sql

BEGIN;

DO $$
DECLARE
  v_service_id uuid;
  v_user_id uuid;
  v_visit_id uuid := gen_random_uuid();
  v_rating_id uuid := gen_random_uuid();
  v_expected_avg numeric;
  v_expected_count integer;
  v_db_avg numeric;
  v_db_count integer;
BEGIN
  SELECT id INTO v_service_id
  FROM public.public_services
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_service_id IS NULL THEN
    RAISE EXCEPTION 'Teste abortado: tabela public.public_services sem registros.';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Teste abortado: tabela auth.users sem registros.';
  END IF;

  INSERT INTO public.service_visits (
    id,
    user_id,
    service_id,
    visited_at,
    detected_at,
    expires_at,
    status
  ) VALUES (
    v_visit_id,
    v_user_id,
    v_service_id,
    now(),
    now(),
    now() + interval '1 day',
    'completed'
  );

  INSERT INTO public.service_ratings (
    id,
    visit_id,
    user_id,
    service_id,
    rating_stars,
    rating_text,
    publication_status,
    is_anonymous
  ) VALUES (
    v_rating_id,
    v_visit_id,
    v_user_id,
    v_service_id,
    5,
    'Atendimento excelente, equipe atenciosa.',
    'published',
    true
  );

  SELECT
    COALESCE(AVG(sr.rating_stars)::numeric, 0),
    COUNT(*)::integer
  INTO v_expected_avg, v_expected_count
  FROM public.service_ratings sr
  WHERE sr.service_id = v_service_id
    AND sr.publication_status = 'published';

  SELECT
    ps.average_rating,
    ps.total_ratings
  INTO v_db_avg, v_db_count
  FROM public.public_services ps
  WHERE ps.id = v_service_id;

  IF v_db_avg IS DISTINCT FROM v_expected_avg THEN
    RAISE EXCEPTION
      'Falha no teste: average_rating divergente. esperado=%, obtido=%',
      v_expected_avg, v_db_avg;
  END IF;

  IF v_db_count IS DISTINCT FROM v_expected_count THEN
    RAISE EXCEPTION
      'Falha no teste: total_ratings/rating_count divergente. esperado=%, obtido=%',
      v_expected_count, v_db_count;
  END IF;

  RAISE NOTICE 'Teste OK: serviço %, average_rating=%, total_ratings=%',
    v_service_id, v_db_avg, v_db_count;
END $$;

ROLLBACK;
