-- Tempo de espera na avaliação estruturada (faixa → nota 2–5; NULL = não se aplica)
ALTER TABLE public.service_ratings
ADD COLUMN IF NOT EXISTS wait_time_score integer NULL;

ALTER TABLE public.service_ratings
DROP CONSTRAINT IF EXISTS service_ratings_wait_time_score_check;

ALTER TABLE public.service_ratings
ADD CONSTRAINT service_ratings_wait_time_score_check
  CHECK (wait_time_score IS NULL OR (wait_time_score >= 2 AND wait_time_score <= 5));

COMMENT ON COLUMN public.service_ratings.wait_time_score IS
  'Nota derivada da faixa de tempo de espera (2–5) ou NULL se o cidadão marcou Não se aplica.';
