-- Indicadores de capacidade a partir de dados abertos (qt_vaga, área m², etc.)
ALTER TABLE public.public_services
  ADD COLUMN IF NOT EXISTS capacity_info TEXT;

COMMENT ON COLUMN public.public_services.capacity_info IS 'Texto de capacidade/capacidade (ex.: "30 vagas", "1.500 m²") preenchido pelo sync GeoSampa a partir de qt_vaga, area_metro, qt_area_metro e afins.';
