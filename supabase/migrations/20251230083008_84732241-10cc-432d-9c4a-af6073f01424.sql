-- Add impact-related columns to urban_reports table
ALTER TABLE urban_reports ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('critical', 'moderate', 'low', 'none'));
ALTER TABLE urban_reports ADD COLUMN IF NOT EXISTS risk_types TEXT[] DEFAULT '{}';
ALTER TABLE urban_reports ADD COLUMN IF NOT EXISTS affected_scope TEXT CHECK (affected_scope IN ('individual', 'street', 'neighborhood', 'zone', 'city'));
ALTER TABLE urban_reports ADD COLUMN IF NOT EXISTS affected_estimate INTEGER;
ALTER TABLE urban_reports ADD COLUMN IF NOT EXISTS active_consequences TEXT[] DEFAULT '{}';
ALTER TABLE urban_reports ADD COLUMN IF NOT EXISTS urgency_reason TEXT;

-- Add index for risk level queries (for dashboard filtering)
CREATE INDEX IF NOT EXISTS idx_urban_reports_risk_level ON urban_reports(risk_level) WHERE risk_level IS NOT NULL;

-- Add index for affected scope queries
CREATE INDEX IF NOT EXISTS idx_urban_reports_affected_scope ON urban_reports(affected_scope) WHERE affected_scope IS NOT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN urban_reports.risk_level IS 'Nível de risco imediato: critical, moderate, low, none';
COMMENT ON COLUMN urban_reports.risk_types IS 'Tipos de risco: electrical, traffic, flooding, structural, health, fire';
COMMENT ON COLUMN urban_reports.affected_scope IS 'Alcance da afetação: individual, street, neighborhood, zone, city';
COMMENT ON COLUMN urban_reports.affected_estimate IS 'Estimativa de pessoas afetadas';
COMMENT ON COLUMN urban_reports.active_consequences IS 'Consequências ativas: power_outage, water_outage, traffic_blocked, flooding, health_hazard';
COMMENT ON COLUMN urban_reports.urgency_reason IS 'Motivo de urgência descrito pelo cidadão';