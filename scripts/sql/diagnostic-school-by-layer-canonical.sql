SELECT source_layer, count(*)::bigint AS canonicos
FROM public.public_services
WHERE service_type = 'school'::public.service_type
  AND duplicate_of IS NULL
GROUP BY source_layer
ORDER BY canonicos DESC;
