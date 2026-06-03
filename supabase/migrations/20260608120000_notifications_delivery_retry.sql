-- Garantias de entrega de notificações (decision 2026-06-01): retry com backoff + dead-letter.
-- Aditivo e reversível: apenas adiciona colunas/índice; nenhum dado alterado.
SET statement_timeout = 0;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS delivery_status text,
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

COMMENT ON COLUMN public.notifications.delivery_status IS
  'Entrega no canal externo: null/pending | failed (aguardando retry) | dead (dead-letter). "sent" é implícito via push_delivered_at IS NOT NULL.';
COMMENT ON COLUMN public.notifications.retry_count IS 'Tentativas de envio no canal externo já realizadas.';
COMMENT ON COLUMN public.notifications.next_retry_at IS 'Quando a próxima tentativa pode ocorrer (backoff exponencial).';

-- Índice da fila de retry: só linhas ainda não entregues e não descartadas.
CREATE INDEX IF NOT EXISTS idx_notifications_retry_queue
  ON public.notifications (next_retry_at)
  WHERE push_delivered_at IS NULL AND discarded_at IS NULL;

RESET statement_timeout;
