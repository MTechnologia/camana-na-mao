-- Fallback ILIKE em search_public_services_fulltext: FTS em português às vezes não casa
-- siglas (CEU), nomes próprios ou grafias; assim "ceu", "biblioteca", "anne frank" ainda encontram equipamentos.

CREATE OR REPLACE FUNCTION public.search_public_services_fulltext(
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  center_lat double precision,
  center_lng double precision,
  radius_meters double precision,
  search_query text,
  service_types text[] DEFAULT NULL,
  result_limit integer DEFAULT 800
)
RETURNS SETOF public.public_services
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT ps.*
  FROM public.public_services ps
  WHERE ps.latitude::double precision >= min_lat
    AND ps.latitude::double precision <= max_lat
    AND ps.longitude::double precision >= min_lng
    AND ps.longitude::double precision <= max_lng
    AND (
      6371000 * acos(
        LEAST(
          1.0::double precision,
          GREATEST(
            -1.0::double precision,
            cos(radians(center_lat)) * cos(radians(ps.latitude::double precision)) *
            cos(radians(ps.longitude::double precision) - radians(center_lng)) +
            sin(radians(center_lat)) * sin(radians(ps.latitude::double precision))
          )
        )
      )
    )::double precision <= radius_meters::double precision
    AND (
      search_query IS NULL
      OR length(trim(search_query)) < 2
      OR ps.search_tsv @@ plainto_tsquery('portuguese', trim(search_query))
      OR (
        length(trim(search_query)) >= 2
        AND (
          lower(ps.name) LIKE '%' || lower(trim(search_query)) || '%'
          OR lower(coalesce(ps.address, '')) LIKE '%' || lower(trim(search_query)) || '%'
          OR lower(coalesce(ps.district, '')) LIKE '%' || lower(trim(search_query)) || '%'
          OR lower(coalesce(ps.services_offered, '')) LIKE '%' || lower(trim(search_query)) || '%'
        )
      )
    )
    AND (
      service_types IS NULL
      OR coalesce(cardinality(service_types), 0) = 0
      OR ps.service_type::text = ANY (service_types)
    )
  ORDER BY (
    6371000 * acos(
      LEAST(
        1.0::double precision,
        GREATEST(
          -1.0::double precision,
          cos(radians(center_lat)) * cos(radians(ps.latitude::double precision)) *
          cos(radians(ps.longitude::double precision) - radians(center_lng)) +
          sin(radians(center_lat)) * sin(radians(ps.latitude::double precision))
        )
      )
    )
  )::double precision ASC
  LIMIT LEAST(coalesce(result_limit, 800), 5000);
$$;

COMMENT ON FUNCTION public.search_public_services_fulltext IS
  'Lista public_services no bbox + raio (m); com 2+ caracteres aplica FTS (search_tsv) e fallback por ILIKE em nome/endereço/bairro/serviços oferecidos.';
