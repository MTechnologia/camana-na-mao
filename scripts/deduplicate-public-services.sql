-- Deduplicação de public_services: um registro por "local" (mesmo source_layer + tipo + coordenadas).
-- Critério de grupo: (source_layer, service_type, lat/lng arredondados em 5 decimais ~1.1m).
-- Em cada grupo mantemos um id (prioridade: com opening_hours; depois com services_offered/ambientes; senão min(id)).
-- Reatribuímos service_visits, service_ratings e service_subscriptions para o id mantido e removemos os demais.
-- Executar no SQL Editor do Supabase (recomendado: rodar primeiro o SELECT de prévia).

BEGIN;

-- 1) Prévia: quantos duplicados serão removidos (só leitura; não altera nada)
-- Descomente e rode para conferir antes do DELETE:
/*
WITH dup_groups AS (
  SELECT
    source_layer,
    service_type,
    ROUND(latitude::numeric, 5) AS lat5,
    ROUND(longitude::numeric, 5) AS lng5,
    COUNT(*) AS cnt
  FROM public.public_services
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL
  GROUP BY 1, 2, 3, 4
  HAVING COUNT(*) > 1
),
ranked AS (
  SELECT
    p.id,
    p.name,
    p.address,
    p.external_id,
    p.source_layer,
    p.service_type,
    ROUND(p.latitude::numeric, 5) AS lat5,
    ROUND(p.longitude::numeric, 5) AS lng5,
    ROW_NUMBER() OVER (
      PARTITION BY p.source_layer, p.service_type,
                   ROUND(p.latitude::numeric, 5), ROUND(p.longitude::numeric, 5)
      ORDER BY
        (CASE WHEN p.opening_hours IS NOT NULL AND trim(p.opening_hours::text) <> '' AND trim(p.opening_hours::text) <> 'null' THEN 0 ELSE 1 END),
        (CASE WHEN (p.services_offered IS NOT NULL AND p.services_offered::text <> 'null') OR (p.ambientes IS NOT NULL AND p.ambientes::text <> '[]') THEN 0 ELSE 1 END),
        p.id
    ) AS rn
  FROM public.public_services p
  WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
)
SELECT r.source_layer, r.service_type, r.name, r.address, r.external_id, r.rn
FROM ranked r
JOIN dup_groups d
  ON d.source_layer = r.source_layer
 AND d.service_type = r.service_type
 AND d.lat5 = r.lat5
 AND d.lng5 = r.lng5
ORDER BY r.source_layer, r.service_type, r.address, r.rn;
*/

-- 2) Tabela temporária: para cada id duplicado, o id que vamos manter
CREATE TEMP TABLE _dup_keep (
  dup_id UUID PRIMARY KEY,
  kept_id UUID NOT NULL
);

INSERT INTO _dup_keep (dup_id, kept_id)
SELECT p.id AS dup_id, first.id AS kept_id
FROM public.public_services p
JOIN LATERAL (
  SELECT id
  FROM public.public_services p2
  WHERE p2.source_layer IS NOT NULL
    AND p2.service_type IS NOT NULL
    AND p2.latitude IS NOT NULL
    AND p2.longitude IS NOT NULL
    AND p2.source_layer = p.source_layer
    AND p2.service_type = p.service_type
    AND ROUND(p2.latitude::numeric, 5) = ROUND(p.latitude::numeric, 5)
    AND ROUND(p2.longitude::numeric, 5) = ROUND(p.longitude::numeric, 5)
  ORDER BY
    (CASE WHEN p2.opening_hours IS NOT NULL AND trim(p2.opening_hours::text) <> '' AND trim(p2.opening_hours::text) <> 'null' THEN 0 ELSE 1 END),
    (CASE WHEN (p2.services_offered IS NOT NULL AND p2.services_offered::text <> 'null') OR (p2.ambientes IS NOT NULL AND p2.ambientes::text <> '[]') THEN 0 ELSE 1 END),
    p2.id
  LIMIT 1
) first ON first.id <> p.id
WHERE p.source_layer IS NOT NULL
  AND p.service_type IS NOT NULL
  AND p.latitude IS NOT NULL
  AND p.longitude IS NOT NULL;

-- 3) Reatribuir service_visits ao id mantido
UPDATE public.service_visits v
SET service_id = k.kept_id
FROM _dup_keep k
WHERE v.service_id = k.dup_id;

-- 4) Reatribuir service_ratings ao id mantido
UPDATE public.service_ratings r
SET service_id = k.kept_id
FROM _dup_keep k
WHERE r.service_id = k.dup_id;

-- 5) service_subscriptions: UNIQUE(user_id, service_id) — remover inscrições duplicadas (user já inscrito no kept) e depois reatribuir
DELETE FROM public.service_subscriptions s
USING _dup_keep k
WHERE s.service_id = k.dup_id
  AND EXISTS (
    SELECT 1 FROM public.service_subscriptions s2
    WHERE s2.user_id = s.user_id AND s2.service_id = k.kept_id
  );

UPDATE public.service_subscriptions s
SET service_id = k.kept_id
FROM _dup_keep k
WHERE s.service_id = k.dup_id;

-- 6) Remover registros duplicados de public_services
DELETE FROM public.public_services
WHERE id IN (SELECT dup_id FROM _dup_keep);

-- 7) Limpar
DROP TABLE _dup_keep;

COMMIT;
