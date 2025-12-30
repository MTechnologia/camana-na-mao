-- Adicionar novas colunas para endereço estruturado e geolocalização
ALTER TABLE urban_reports 
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS street_number TEXT,
ADD COLUMN IF NOT EXISTS reference_point TEXT;

-- Comentários nas colunas para documentação
COMMENT ON COLUMN urban_reports.street IS 'Nome da rua/avenida (estruturado)';
COMMENT ON COLUMN urban_reports.street_number IS 'Número ou "sem número"';
COMMENT ON COLUMN urban_reports.reference_point IS 'Ponto de referência próximo';
COMMENT ON COLUMN urban_reports.latitude IS 'Latitude para geolocalização';
COMMENT ON COLUMN urban_reports.longitude IS 'Longitude para geolocalização';

-- Adicionar índice para buscas por bairro
CREATE INDEX IF NOT EXISTS idx_urban_reports_neighborhood ON urban_reports USING btree (
  (ai_classification->>'neighborhood')
) WHERE ai_classification->>'neighborhood' IS NOT NULL;