-- Adiciona coluna JSONB para scores de dimensões (infraestrutura, limpeza, atendimento, etc.)
ALTER TABLE public.service_ratings
ADD COLUMN IF NOT EXISTS dimensions jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.service_ratings.dimensions IS
  'Scores estruturados das dimensões de avaliação (infraestrutura, limpeza, atendimento, etc.) em formato JSONB.';
