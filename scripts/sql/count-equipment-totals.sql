-- Totais de equipamentos em public_services.
-- canonicos: exclui duplicados soft-dedupe (duplicate_of), se a coluna existir.

SELECT
  count(*)::bigint AS total_linhas,
  count(*) FILTER (WHERE duplicate_of IS NULL)::bigint AS canonicos,
  count(*) FILTER (WHERE duplicate_of IS NOT NULL)::bigint AS duplicados_soft
FROM public.public_services;
