-- Reverte avaliação multidimensional no relato urbano (mantida apenas em service_rating)
ALTER TABLE public.urban_reports
  DROP COLUMN IF EXISTS urban_rating_dimensions;
