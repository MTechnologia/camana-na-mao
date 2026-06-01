-- Perf /servicos-proximos: a tabela public_services cresceu (~77k linhas via ETL GeoSampa)
-- e as queries REST de bbox passaram a estourar o statement_timeout (~8s).
-- Garante os índices (podem estar ausentes em prod por drift de migrations) + refresh de estatísticas.
SET statement_timeout = 0;

-- Índice composto tipo + bbox (re-assert idempotente; pode não ter sido aplicado em prod).
CREATE INDEX IF NOT EXISTS idx_public_services_service_type_lat_lng
  ON public.public_services (service_type, latitude, longitude);

-- Índice canônico (apenas duplicate_of IS NULL) — casa exatamente a query do hook useNearbyServices
-- (service_type = X AND latitude BETWEEN .. AND longitude BETWEEN .. AND duplicate_of IS NULL).
CREATE INDEX IF NOT EXISTS idx_public_services_canonical_type_latlng
  ON public.public_services (service_type, latitude, longitude)
  WHERE duplicate_of IS NULL;

-- RPC para o ETL refrescar estatísticas após cada sync (autovacuum pode atrasar após bulk upsert).
CREATE OR REPLACE FUNCTION public.analyze_public_services()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  ANALYZE public.public_services;
END;
$$;
REVOKE ALL ON FUNCTION public.analyze_public_services() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analyze_public_services() TO service_role;

COMMENT ON FUNCTION public.analyze_public_services() IS
  'Refresca estatísticas de public_services (chamada pelo ETL GeoSampa pós-sync).';

-- Refresh imediato das estatísticas (corrige plano após o bulk insert do ETL).
ANALYZE public.public_services;

RESET statement_timeout;
