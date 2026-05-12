-- Subconjunto para estimativa Google Places (Place Details), alinhado a camadas / tipos
-- descritos em docs/comparativo-equipamentos-antes-depois-google-places.md (secção 5).
--
-- Transporte: só metrô, trem e terminal de ônibus (exclui ponto_onibus e outros transit_station).
-- Escola: só SME/GeoSampa rede pública EF+M, infantil pública, técnico público, SENAI/SESI/SENAC
--         (exclui rede_privada, educacao_outros, escola_aberta sem layer, etc., se não casarem).
-- Equipamentos: park, sports_center, ceu, theater, library, museum (service_type).
--
-- Custo ilustrativo na query: max(0, N_total - 1000) * 0.025 USD (mesmas premissas do comparativo).

WITH tagged AS (
  SELECT
    id,
    CASE
      WHEN service_type = 'transit_station'
           AND source_layer IN ('estacao_metro', 'estacao_metro_projeto')
        THEN 'transit_estacao_metro'
      WHEN service_type = 'transit_station'
           AND source_layer IN ('estacao_trem', 'estacao_trem_projeto')
        THEN 'transit_estacao_trem'
      WHEN service_type = 'transit_station'
           AND source_layer = 'terminal_onibus'
        THEN 'transit_terminal_onibus'
      WHEN service_type = 'school'
           AND source_layer = 'ensino_fundamental_medio'
        THEN 'school_ensino_fundamental_medio'
      WHEN service_type = 'school'
           AND source_layer = 'educacao_infantil'
        THEN 'school_educacao_infantil'
      WHEN service_type = 'school'
           AND source_layer = 'ensino_tecnico'
        THEN 'school_ensino_tecnico'
      WHEN service_type = 'school'
           AND source_layer = 'senai_sesi_senac'
        THEN 'school_senai_sesi_senac'
      WHEN service_type = 'park' THEN 'park'
      WHEN service_type = 'sports_center' THEN 'sports_center'
      WHEN service_type = 'ceu' THEN 'ceu'
      WHEN service_type = 'theater' THEN 'theater'
      WHEN service_type = 'library' THEN 'library'
      WHEN service_type = 'museum' THEN 'museum'
      ELSE NULL
    END AS cohort
  FROM public.public_services
)
SELECT cohort, COUNT(*)::bigint AS n
FROM tagged
WHERE cohort IS NOT NULL
GROUP BY cohort
ORDER BY cohort;

-- Total do subconjunto + custo ilustrativo (USD) e BRL a R$ 5,50/USD
WITH tagged AS (
  SELECT
    id,
    CASE
      WHEN service_type = 'transit_station'
           AND source_layer IN ('estacao_metro', 'estacao_metro_projeto')
        THEN 'transit_estacao_metro'
      WHEN service_type = 'transit_station'
           AND source_layer IN ('estacao_trem', 'estacao_trem_projeto')
        THEN 'transit_estacao_trem'
      WHEN service_type = 'transit_station'
           AND source_layer = 'terminal_onibus'
        THEN 'transit_terminal_onibus'
      WHEN service_type = 'school'
           AND source_layer = 'ensino_fundamental_medio'
        THEN 'school_ensino_fundamental_medio'
      WHEN service_type = 'school'
           AND source_layer = 'educacao_infantil'
        THEN 'school_educacao_infantil'
      WHEN service_type = 'school'
           AND source_layer = 'ensino_tecnico'
        THEN 'school_ensino_tecnico'
      WHEN service_type = 'school'
           AND source_layer = 'senai_sesi_senac'
        THEN 'school_senai_sesi_senac'
      WHEN service_type = 'park' THEN 'park'
      WHEN service_type = 'sports_center' THEN 'sports_center'
      WHEN service_type = 'ceu' THEN 'ceu'
      WHEN service_type = 'theater' THEN 'theater'
      WHEN service_type = 'library' THEN 'library'
      WHEN service_type = 'museum' THEN 'museum'
      ELSE NULL
    END AS cohort
  FROM public.public_services
),
agg AS (
  SELECT COUNT(*)::bigint AS n_total
  FROM tagged
  WHERE cohort IS NOT NULL
)
SELECT
  n_total,
  ROUND(GREATEST(0, n_total - 1000) * 0.025, 2) AS usd_approx,
  ROUND(GREATEST(0, n_total - 1000) * 0.025 * 5.50, 2) AS brl_approx_cambio_5_50
FROM agg;
