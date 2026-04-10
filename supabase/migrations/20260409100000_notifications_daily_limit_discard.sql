-- RN-NOT-002: limite diário de notificações não críticas; descarte com discarded_at / discard_reason.
-- RPC para contagem de entregas no dia civil (fuso IANA), excluindo críticas e linhas descartadas.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS discarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discard_reason TEXT;

COMMENT ON COLUMN public.notifications.discarded_at IS
  'Preenchido quando a notificação não será entregue (ex.: daily_limit). RN-NOT-002.';
COMMENT ON COLUMN public.notifications.discard_reason IS
  'Motivo do descarte; ex.: daily_limit.';

CREATE INDEX IF NOT EXISTS idx_notifications_user_discarded
  ON public.notifications (user_id)
  WHERE discarded_at IS NOT NULL;

-- Conta entregas não críticas já concretizadas hoje (push_delivered_at no dia civil p_tz).
CREATE OR REPLACE FUNCTION public.check_notification_daily_limit(
  p_user_id uuid,
  p_tz text DEFAULT 'America/Sao_Paulo'
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.notifications n
  WHERE n.user_id = p_user_id
    AND COALESCE(n.priority, 'normal') IS DISTINCT FROM 'critical'
    AND n.discarded_at IS NULL
    AND n.push_delivered_at IS NOT NULL
    AND (n.push_delivered_at AT TIME ZONE p_tz)::date = (now() AT TIME ZONE p_tz)::date;
$$;

COMMENT ON FUNCTION public.check_notification_daily_limit IS
  'RN-NOT-002: retorna quantas notificações não críticas já tiveram entrega registrada (push_delivered_at) no dia civil de p_tz.';

REVOKE ALL ON FUNCTION public.check_notification_daily_limit(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_notification_daily_limit(uuid, text) TO service_role;
