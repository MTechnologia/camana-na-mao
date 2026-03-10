-- Permite upsert de public_services por origem GeoSampa (sync periódico).
-- source_layer: ex. 'ponto_onibus', 'educacao_rede_privada'
-- external_id: ID do feature no GeoJSON (ex. ponto_onibus.fid--534fdaad_19c26...)
-- Linhas inseridas manualmente ou por outro processo podem ter source_layer/external_id NULL.

ALTER TABLE public.public_services
  ADD COLUMN IF NOT EXISTS source_layer TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_public_services_geosampa_key
  ON public.public_services (source_layer, external_id)
  WHERE source_layer IS NOT NULL AND external_id IS NOT NULL;

COMMENT ON COLUMN public.public_services.source_layer IS 'Origem do dado no sync GeoSampa (ex: ponto_onibus, educacao_rede_privada)';
COMMENT ON COLUMN public.public_services.external_id IS 'ID do feature no GeoJSON/GeoSampa para upsert';
