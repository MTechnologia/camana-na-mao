-- Serviços oferecidos / descrição do equipamento (ex.: texto do GeoSampa tx_tipo_equipamento).
ALTER TABLE public.public_services
  ADD COLUMN IF NOT EXISTS services_offered TEXT;

COMMENT ON COLUMN public.public_services.services_offered IS 'Descrição dos serviços oferecidos (ex.: do GeoSampa tx_tipo_equipamento)';
