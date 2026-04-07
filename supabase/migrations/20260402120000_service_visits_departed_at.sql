-- OS-06: registro da hora em que o munícipe sai do geofence (50 m) do equipamento.
-- Duração da visita: departed_at - created_at (quando ambos preenchidos).

ALTER TABLE public.service_visits
  ADD COLUMN IF NOT EXISTS departed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.service_visits.departed_at IS
  'Preenchido quando o usuário se afasta (>50 m) de um serviço com visita pending e sem saída registrada; permite calcular duração (departed_at - created_at).';

CREATE INDEX IF NOT EXISTS idx_service_visits_pending_no_departure
  ON public.service_visits (user_id)
  WHERE status = 'pending'::visit_status AND departed_at IS NULL;
