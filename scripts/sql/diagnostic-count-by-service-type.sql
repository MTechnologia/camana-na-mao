SELECT service_type::text AS service_type, count(*)::bigint AS cnt
FROM public.public_services
GROUP BY service_type
ORDER BY cnt DESC;
