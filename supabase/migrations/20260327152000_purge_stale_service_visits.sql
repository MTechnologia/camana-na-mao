-- Expurgo de registros de visita antigos **sem avaliação** (minimização LGPD).
-- Não remove visitas vinculadas a service_ratings (histórico de avaliação).
-- Executar manualmente ou via job interno (ex.: mensal); não agenda automaticamente.

CREATE OR REPLACE FUNCTION public.purge_old_stale_service_visits_without_ratings(
  p_keep_days integer DEFAULT 365
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer := 0;
  v_keep interval;
BEGIN
  IF public.has_any_role(auth.uid(), array['admin','gestor']::public.app_role[]) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Apenas admin/gestor pode executar expurgo de registros de visita antigos.';
  END IF;

  v_keep := (LEAST(GREATEST(p_keep_days, 90), 3650) || ' days')::interval;

  DELETE FROM public.service_visits sv
  WHERE NOT EXISTS (SELECT 1 FROM public.service_ratings sr WHERE sr.visit_id = sv.id)
    AND (
      (sv.status IN ('expired', 'skipped') AND sv.updated_at < now() - v_keep)
      OR (sv.status = 'pending' AND sv.expires_at < now() - v_keep)
    );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.purge_old_stale_service_visits_without_ratings(integer) IS
  'Remove visitas sem avaliação (expiradas/ignoradas/pendentes muito antigas). Manter histórico de avaliações.';

GRANT EXECUTE ON FUNCTION public.purge_old_stale_service_visits_without_ratings(integer) TO authenticated;
