-- HU-6.4 / HU-6.5: coleta estruturada de transporte (parada / detalhes de acessibilidade)
ALTER TABLE public.transport_reports
  ADD COLUMN IF NOT EXISTS stop_name text,
  ADD COLUMN IF NOT EXISTS stop_location text,
  ADD COLUMN IF NOT EXISTS accessibility_details jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.transport_reports.stop_name IS
  'HU-6.4: nome do ponto, terminal ou estação relacionado à ocorrência.';
COMMENT ON COLUMN public.transport_reports.stop_location IS
  'HU-6.4: localização textual do ponto (endereço, referência) ou coordenadas no formato lat,lng quando coletadas.';
COMMENT ON COLUMN public.transport_reports.accessibility_details IS
  'HU-6.5: detalhes estruturados de acessibilidade (ex.: rampa, elevador, assistência) em JSON.';
