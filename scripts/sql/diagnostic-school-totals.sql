SELECT
  count(*)::bigint AS linhas_total_school,
  count(*) FILTER (WHERE duplicate_of IS NULL)::bigint AS escolas_canonicas,
  count(*) FILTER (WHERE duplicate_of IS NOT NULL)::bigint AS linhas_duplicata_soft
FROM public.public_services
WHERE service_type = 'school'::public.service_type;
