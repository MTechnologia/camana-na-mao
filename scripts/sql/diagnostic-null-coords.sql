SELECT
  count(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL)::bigint AS sem_coordenadas,
  count(*)::bigint AS total
FROM public.public_services;
