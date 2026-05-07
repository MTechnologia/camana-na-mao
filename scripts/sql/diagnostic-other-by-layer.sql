SELECT source_layer, count(*)::bigint AS cnt
FROM public.public_services
WHERE service_type = 'other'::public.service_type
GROUP BY source_layer
ORDER BY cnt DESC, source_layer;
