-- Add neighborhood column to urban_reports table
ALTER TABLE urban_reports ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- Create index for efficient neighborhood queries
CREATE INDEX IF NOT EXISTS idx_urban_reports_neighborhood ON urban_reports(neighborhood);