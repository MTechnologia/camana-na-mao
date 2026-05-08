-- Status das camadas de transporte ainda classificadas como other.

SELECT
  source_layer,
  count(*)::bigint AS remaining
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
GROUP BY source_layer
ORDER BY remaining DESC, source_layer;
