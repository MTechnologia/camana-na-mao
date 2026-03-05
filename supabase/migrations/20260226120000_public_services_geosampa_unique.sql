-- Garante constraint UNIQUE (source_layer, external_id) para o upsert do sync GeoSampa.
-- Vários NULLs são permitidos; apenas pares (não nulo, não nulo) precisam ser únicos.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.public_services'::regclass
      AND conname = 'public_services_geosampa_key'
      AND contype = 'u'
  ) THEN
    ALTER TABLE public.public_services
      ADD CONSTRAINT public_services_geosampa_key UNIQUE (source_layer, external_id);
  END IF;
END $$;
