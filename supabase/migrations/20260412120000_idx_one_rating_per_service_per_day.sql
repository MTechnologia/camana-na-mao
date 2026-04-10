-- RN-AVA-003: no máximo 1 avaliação por usuário, serviço e dia civil (America/Sao_Paulo).
-- Remove duplicatas históricas (mantém o registro mais antigo de cada grupo) antes do índice único.

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        user_id,
        service_id,
        ((timezone('America/Sao_Paulo', created_at))::date)
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.service_ratings
)
DELETE FROM public.service_ratings sr
USING ranked r
WHERE sr.id = r.id
  AND r.rn > 1;

-- Índice único parcial: predicado explícito (created_at NOT NULL em linhas válidas).
CREATE UNIQUE INDEX idx_one_rating_per_service_per_day
  ON public.service_ratings (
    user_id,
    service_id,
    ((timezone('America/Sao_Paulo', created_at))::date)
  )
  WHERE created_at IS NOT NULL;

COMMENT ON INDEX public.idx_one_rating_per_service_per_day IS
  'RN-AVA-003: garante no máximo uma linha por (user_id, service_id, dia civil America/Sao_Paulo).';
