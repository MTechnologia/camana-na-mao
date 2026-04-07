-- Avaliação multidimensional no chat (atendimento, limpeza, infraestrutura, tempo de espera)
ALTER TABLE public.service_ratings
  ADD COLUMN IF NOT EXISTS rating_dimensions jsonb;

COMMENT ON COLUMN public.service_ratings.rating_dimensions IS
  'Notas 1-5 por dimensão: atendimento, limpeza, infraestrutura, tempo_espera. rating_stars permanece como média arredondada para compatibilidade.';
