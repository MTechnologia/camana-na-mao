-- Protocolo amigável para o cidadão: REL-YYYY-NNNNNN (antes URB-)
-- Transporte permanece TRP-YYYY-NNNNNN

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

  v_prefix := CASE p_type
    WHEN 'urban' THEN 'REL'
    WHEN 'transport' THEN 'TRP'
    ELSE 'GEN'
  END;

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

  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
END;
$$;

-- Atualiza relatos já exibidos com URB- para REL- (mesmo número sequencial)
UPDATE urban_reports
SET protocol_code = REPLACE(protocol_code, 'URB-', 'REL-')
WHERE protocol_code LIKE 'URB-%';

COMMENT ON FUNCTION generate_protocol_code(TEXT) IS
  'Gera protocolo único: urban=REL-YYYY-NNNNNN, transport=TRP-YYYY-NNNNNN';
