-- RN-AVA-002: lembrete 24h–48h (evaluation_reminder); expiração 48h sem avaliação.

ALTER TABLE public.service_visits
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.service_visits.reminder_sent IS
  'True após inserir notificação evaluation_reminder (24h–48h sem avaliação).';

CREATE INDEX IF NOT EXISTS idx_service_visits_pending_reminder_candidates
  ON public.service_visits (created_at)
  WHERE status = 'pending'::public.visit_status
    AND reminder_sent = false;

CREATE INDEX IF NOT EXISTS idx_service_visits_pending_expire_candidates
  ON public.service_visits (created_at)
  WHERE status = 'pending'::public.visit_status;

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
  'RN-AVA-002: pending sem rating e created_at <= now()-48h → expired.';

REVOKE ALL ON FUNCTION public.expire_pending_visits_over_48h() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_pending_visits_over_48h() TO service_role;
