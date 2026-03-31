-- Otimização para cenário "sem filtro" no Nearby:
-- - índice para bbox + ordenação por id
-- - índice parcial excluindo service_type='other' (caso padrão da UI)
-- - timeout maior na RPC leve para reduzir fallback prematuro

SET statement_timeout = 0;

CREATE INDEX IF NOT EXISTS idx_public_services_lat_lng_id
  ON public.public_services (latitude, longitude, id);

COMMENT ON INDEX idx_public_services_lat_lng_id IS
  'Acelera consultas por bbox com ordenação estável por id.';

CREATE INDEX IF NOT EXISTS idx_public_services_lat_lng_id_not_other
  ON public.public_services (latitude, longitude, id)
  WHERE service_type <> 'other'::public.service_type;

COMMENT ON INDEX idx_public_services_lat_lng_id_not_other IS
  'Acelera Nearby sem filtro de tipo (UI exclui categoria other).';

ALTER FUNCTION public.search_public_services_bbox_light(
  double precision,
  double precision,
  double precision,
  double precision,
  text[],
  integer,
  integer
) SET statement_timeout TO '90s';

RESET statement_timeout;
