-- Escolas, UBS e hospitais (UPA costuma ser classificada como hospital no enum).
SELECT service_type::text AS service_type, count(*)::bigint AS n
FROM public.public_services
WHERE service_type IN (
  'school'::public.service_type,
  'ubs'::public.service_type,
  'hospital'::public.service_type
)
GROUP BY service_type
ORDER BY n DESC;

SELECT count(*)::bigint AS total_escolas_ubs_hospital
FROM public.public_services
WHERE service_type IN (
  'school'::public.service_type,
  'ubs'::public.service_type,
  'hospital'::public.service_type
);
