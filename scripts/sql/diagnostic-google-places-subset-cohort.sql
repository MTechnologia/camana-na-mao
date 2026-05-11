-- Contagens do subconjunto Google Places por coorte/source_layer e por service_type.
-- Marco C: usar apenas public_services canonicos (duplicate_of IS NULL).

WITH subset AS (
  SELECT
    CASE
      WHEN ps.service_type = 'school'::public.service_type
        AND ps.source_layer IN (
          'ensino_fundamental_medio',
          'educacao_infantil',
          'ensino_tecnico',
          'senai_sesi_senac'
        )
        THEN 'Escola (4 camadas SME/GeoSampa)'

      WHEN ps.service_type = 'transit_station'::public.service_type
        AND ps.source_layer IN (
          'estacao_metro',
          'estacao_metro_projeto',
          'estacao_trem',
          'estacao_trem_projeto',
          'terminal_onibus'
        )
        THEN 'Transporte (metro, trem, terminal)'

      WHEN ps.service_type = 'park'::public.service_type THEN 'Parque'
      WHEN ps.service_type = 'sports_center'::public.service_type THEN 'Centro esportivo'
      WHEN ps.service_type = 'ceu'::public.service_type THEN 'CEU'
      WHEN ps.service_type = 'theater'::public.service_type THEN 'Teatro / cinema'
      WHEN ps.service_type = 'library'::public.service_type THEN 'Biblioteca'
      WHEN ps.service_type = 'museum'::public.service_type THEN 'Museu'
      ELSE NULL
    END AS linha
  FROM public.public_services ps
  WHERE ps.duplicate_of IS NULL
)
SELECT
  linha,
  count(*)::bigint AS n
FROM subset
WHERE linha IS NOT NULL
GROUP BY linha
ORDER BY
  CASE linha
    WHEN 'Escola (4 camadas SME/GeoSampa)' THEN 1
    WHEN 'Transporte (metro, trem, terminal)' THEN 2
    WHEN 'Parque' THEN 3
    WHEN 'Centro esportivo' THEN 4
    WHEN 'CEU' THEN 5
    WHEN 'Teatro / cinema' THEN 6
    WHEN 'Biblioteca' THEN 7
    WHEN 'Museu' THEN 8
    ELSE 99
  END;
