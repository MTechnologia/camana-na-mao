-- Checa referencias antes de remover transporte antigo classificado como other.

WITH target AS (
  SELECT id
  FROM public.public_services
  WHERE service_type = 'other'::public.service_type
    AND source_layer IN (
      'ponto_onibus',
      'estacao_metro',
      'estacao_trem',
      'terminal_onibus',
      'estacao_metro_projeto',
      'estacao_trem_projeto'
    )
)
SELECT 'target_public_services' AS table_name, count(*)::bigint AS rows
FROM target
UNION ALL
SELECT 'service_visits', count(*)::bigint
FROM public.service_visits sv
JOIN target t ON t.id = sv.service_id
UNION ALL
SELECT 'service_ratings', count(*)::bigint
FROM public.service_ratings sr
JOIN target t ON t.id = sr.service_id
UNION ALL
SELECT 'service_subscriptions', count(*)::bigint
FROM public.service_subscriptions ss
JOIN target t ON t.id = ss.service_id
UNION ALL
SELECT 'service_favorites', count(*)::bigint
FROM public.service_favorites sf
JOIN target t ON t.id = sf.service_id
UNION ALL
SELECT 'service_corrections', count(*)::bigint
FROM public.service_corrections sc
JOIN target t ON t.id = sc.service_id
UNION ALL
SELECT 'service_plan_items', count(*)::bigint
FROM public.service_plan_items spi
JOIN target t ON t.id = spi.service_id
UNION ALL
SELECT 'service_alerts', count(*)::bigint
FROM public.service_alerts sa
JOIN target t ON t.id = sa.service_id
ORDER BY table_name;
