-- Adiciona tipo "street_market" (Feira / Feirão) ao enum service_type (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'service_type' AND e.enumlabel = 'street_market'
  ) THEN
    ALTER TYPE public.service_type ADD VALUE 'street_market';
  END IF;
END $$;
