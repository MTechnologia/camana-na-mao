-- (Histórico) Coluna adicionada para experimento urbano; removida na migração seguinte — avaliação multidimensional fica só em service_rating.
ALTER TABLE public.urban_reports
  ADD COLUMN IF NOT EXISTS urban_rating_dimensions jsonb;

COMMENT ON COLUMN public.urban_reports.urban_rating_dimensions IS
  'Notas 1-5 por dimensão no entorno do relato: atendimento, limpeza, infraestrutura, tempo_espera.';
