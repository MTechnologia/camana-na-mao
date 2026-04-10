-- Tipos sugeridos em docs/tipos-de-servico-sugeridos.md para reclassificar "other" (idempotente)
DO $$
DECLARE
  v_vals TEXT[] := ARRAY['community_center','daycare','park','social_assistance','police_station','transit_station','market','theater','museum','cemetery'];
  v_val TEXT;
BEGIN
  FOREACH v_val IN ARRAY v_vals
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'service_type' AND e.enumlabel = v_val
    ) THEN
      EXECUTE format('ALTER TYPE public.service_type ADD VALUE %L', v_val);
    END IF;
  END LOOP;
END $$;
