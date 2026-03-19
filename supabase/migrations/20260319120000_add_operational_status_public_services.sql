-- Status operacional (aberto/fechado/em manutenção) para public.public_services

DO $$
BEGIN
  BEGIN
    CREATE TYPE public.operational_status AS ENUM ('open', 'closed', 'maintenance');
  EXCEPTION
    WHEN duplicate_object THEN
      -- Tipo já existe
      NULL;
  END;
END
$$;

ALTER TABLE public.public_services
  ADD COLUMN IF NOT EXISTS operational_status public.operational_status;

COMMENT ON COLUMN public.public_services.operational_status
  IS 'Status operacional do serviço: open/closed/maintenance (fonte: GeoSampa).';

