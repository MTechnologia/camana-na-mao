-- Add protocol_code column to urban_reports
ALTER TABLE urban_reports 
ADD COLUMN protocol_code TEXT UNIQUE;

-- Add protocol_code column to transport_reports
ALTER TABLE transport_reports
ADD COLUMN protocol_code TEXT UNIQUE;

-- Create indexes for fast protocol search
CREATE INDEX idx_urban_reports_protocol ON urban_reports(protocol_code);
CREATE INDEX idx_transport_reports_protocol ON transport_reports(protocol_code);

-- Create sequence tracking table
CREATE TABLE protocol_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_type TEXT NOT NULL UNIQUE,
  current_year INTEGER NOT NULL,
  current_sequence INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE protocol_sequences ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage sequences (used by edge functions)
CREATE POLICY "Service role can manage sequences"
ON protocol_sequences
FOR ALL
USING (true)
WITH CHECK (true);

-- Initialize sequences
INSERT INTO protocol_sequences (sequence_type, current_year, current_sequence)
VALUES 
  ('urban', 2025, 0),
  ('transport', 2025, 0);

-- Create atomic protocol generation function
CREATE OR REPLACE FUNCTION generate_protocol_code(p_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_year INTEGER;
  v_sequence INTEGER;
  v_current_year INTEGER;
BEGIN
  v_current_year := EXTRACT(YEAR FROM NOW())::INTEGER;
  
  -- Define prefix based on type
  v_prefix := CASE p_type
    WHEN 'urban' THEN 'URB'
    WHEN 'transport' THEN 'TRP'
    ELSE 'GEN'
  END;
  
  -- Atomic lock and update
  UPDATE protocol_sequences
  SET 
    current_sequence = CASE 
      WHEN current_year < v_current_year THEN 1
      ELSE current_sequence + 1
    END,
    current_year = v_current_year,
    updated_at = NOW()
  WHERE sequence_type = p_type
  RETURNING current_year, current_sequence INTO v_year, v_sequence;
  
  -- Return formatted code
  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
END;
$$;

-- Generate protocol codes for existing urban reports
WITH numbered_urban AS (
  SELECT id, created_at, ROW_NUMBER() OVER (ORDER BY created_at) as seq
  FROM urban_reports
  WHERE protocol_code IS NULL
)
UPDATE urban_reports u
SET protocol_code = 'URB-' || EXTRACT(YEAR FROM u.created_at)::TEXT || '-' || LPAD(n.seq::TEXT, 6, '0')
FROM numbered_urban n
WHERE u.id = n.id;

-- Generate protocol codes for existing transport reports
WITH numbered_transport AS (
  SELECT id, created_at, ROW_NUMBER() OVER (ORDER BY created_at) as seq
  FROM transport_reports
  WHERE protocol_code IS NULL
)
UPDATE transport_reports t
SET protocol_code = 'TRP-' || EXTRACT(YEAR FROM t.created_at)::TEXT || '-' || LPAD(n.seq::TEXT, 6, '0')
FROM numbered_transport n
WHERE t.id = n.id;

-- Update sequences with the count of existing reports
UPDATE protocol_sequences 
SET current_sequence = COALESCE((
  SELECT COUNT(*) FROM urban_reports 
  WHERE protocol_code IS NOT NULL 
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
), 0)
WHERE sequence_type = 'urban';

UPDATE protocol_sequences 
SET current_sequence = COALESCE((
  SELECT COUNT(*) FROM transport_reports 
  WHERE protocol_code IS NOT NULL 
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
), 0)
WHERE sequence_type = 'transport';