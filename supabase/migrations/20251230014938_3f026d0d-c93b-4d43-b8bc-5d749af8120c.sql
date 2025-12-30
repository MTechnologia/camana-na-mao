-- Add CEP column to urban_reports for standardized address collection
ALTER TABLE urban_reports ADD COLUMN IF NOT EXISTS cep VARCHAR(9);

-- Create index for CEP lookups
CREATE INDEX IF NOT EXISTS idx_urban_reports_cep ON urban_reports(cep);