-- NREF012: ao expirar visitas pending (48h sem avaliação), preencher departed_at se ainda nulo.

CREATE OR REPLACE FUNCTION public.expire_pending_visits_over_48h()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.service_visits sv
  SET status = 'expired'::public.visit_status,
      departed_at = COALESCE(sv.departed_at, now()),
      updated_at = now()
  WHERE sv.status = 'pending'::public.visit_status
    AND sv.created_at <= (now() - interval '48 hours')
    AND NOT EXISTS (
      SELECT 1 FROM public.service_ratings sr WHERE sr.visit_id = sv.id
    );
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

COMMENT ON FUNCTION public.expire_pending_visits_over_48h IS
  'RN-AVA-002: pending sem rating e created_at <= now()-48h → expired; preenche departed_at se ausente (NREF012).';
