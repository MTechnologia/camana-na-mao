-- Classificacao de natureza do equipamento para filtro Publico/Privado.
-- V1: persiste classificacao por fonte/camada e permite refinamento pelo sync GeoSampa
-- quando a camada traz esfera administrativa (ex.: hospitais).

ALTER TABLE public.public_services
  ADD COLUMN IF NOT EXISTS equipment_nature TEXT,
  ADD COLUMN IF NOT EXISTS equipment_nature_source TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'public_services_equipment_nature_check'
      AND conrelid = 'public.public_services'::regclass
  ) THEN
    ALTER TABLE public.public_services
      ADD CONSTRAINT public_services_equipment_nature_check
      CHECK (
        equipment_nature IS NULL
        OR equipment_nature IN ('publico', 'privado', 'misto_indefinido', 'nao_aplicavel')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.public_services.equipment_nature IS
  'Natureza do equipamento para filtros: publico, privado, misto_indefinido ou nao_aplicavel.';
COMMENT ON COLUMN public.public_services.equipment_nature_source IS
  'Origem da classificacao de natureza (ex.: geosampa_esfera_administrativa, source_layer_rule, manual_admin, google_places).';

UPDATE public.public_services
SET
  equipment_nature = CASE
    WHEN source_layer IN ('rede_privada') THEN 'privado'
    WHEN source_layer IN (
      'hospital',
      'urgencia_emergencia',
      'equipamento_saude_ambulatorios_especializados',
      'equipamento_saude_saude_mental',
      'equipamento_ccz',
      'educacao_outros',
      'senai_sesi_senac',
      'teatro_cinema_show',
      'museus',
      'espacos_culturais',
      'equipamento_cultura_outros'
    ) THEN 'misto_indefinido'
    WHEN source_layer IS NOT NULL THEN 'publico'
    ELSE NULL
  END,
  equipment_nature_source = CASE
    WHEN source_layer IS NOT NULL THEN 'source_layer_rule'
    ELSE equipment_nature_source
  END
WHERE equipment_nature IS NULL;

CREATE INDEX IF NOT EXISTS idx_public_services_equipment_nature
  ON public.public_services (equipment_nature);

CREATE INDEX IF NOT EXISTS idx_public_services_equipment_nature_lat_lng
  ON public.public_services (equipment_nature, latitude, longitude);

DROP FUNCTION IF EXISTS public.search_public_services_bbox_light(
  double precision,
  double precision,
  double precision,
  double precision,
  text[],
  integer,
  integer
);

CREATE OR REPLACE FUNCTION public.search_public_services_bbox_light(
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  service_types text[] DEFAULT NULL,
  result_limit integer DEFAULT 1500,
  result_offset integer DEFAULT 0,
  equipment_natures text[] DEFAULT NULL
)
RETURNS SETOF public.public_services
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('statement_timeout', '120000', true);
  RETURN QUERY
  SELECT ps.*
  FROM public.public_services ps
  WHERE ps.latitude >= min_lat
    AND ps.latitude <= max_lat
    AND ps.longitude >= min_lng
    AND ps.longitude <= max_lng
    AND (
      service_types IS NULL
      OR coalesce(cardinality(service_types), 0) = 0
      OR ps.service_type = ANY(service_types::service_type[])
    )
    AND (
      equipment_natures IS NULL
      OR coalesce(cardinality(equipment_natures), 0) = 0
      OR ps.equipment_nature = ANY(equipment_natures)
    )
  LIMIT LEAST(GREATEST(coalesce(result_limit, 1500), 1), 5000)
  OFFSET GREATEST(coalesce(result_offset, 0), 0);
END;
$$;

ALTER FUNCTION public.search_public_services_bbox_light(
  double precision,
  double precision,
  double precision,
  double precision,
  text[],
  integer,
  integer,
  text[]
) SET statement_timeout TO '120s';

COMMENT ON FUNCTION public.search_public_services_bbox_light(
  double precision,
  double precision,
  double precision,
  double precision,
  text[],
  integer,
  integer,
  text[]
) IS
  'Bbox + tipo(s) + natureza(s), sem ORDER BY; predicados float8; timeout local na transacao.';

GRANT EXECUTE ON FUNCTION public.search_public_services_bbox_light(
  double precision,
  double precision,
  double precision,
  double precision,
  text[],
  integer,
  integer,
  text[]
) TO authenticated, anon;
