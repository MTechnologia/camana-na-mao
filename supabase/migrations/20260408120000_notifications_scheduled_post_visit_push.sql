-- OS-06: push agendado 15 min após departed_at (RN-AVA-002: só se ainda houver janela de avaliação)
-- priority já existe em notifications (default 'normal'); adicionamos agendamento e rastreio de envio push.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS push_delivered_at TIMESTAMPTZ;

COMMENT ON COLUMN public.notifications.scheduled_for IS
  'Quando preenchido, o webhook send-web-push não envia até a data; process-scheduled-notifications dispara o push.';
COMMENT ON COLUMN public.notifications.push_delivered_at IS
  'Preenchido após tentativa de envio pelo job (evita reenvio a cada 5 min).';

CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_push_pending
  ON public.notifications (scheduled_for)
  WHERE scheduled_for IS NOT NULL AND push_delivered_at IS NULL;

-- Agenda lembrete 15 min após saída do geofence, se ainda couber na janela min(expires_at, created_at+48h).
CREATE OR REPLACE FUNCTION public.schedule_post_visit_rating_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  send_at timestamptz;
  rating_deadline timestamptz;
  svc_name text;
BEGIN
  IF NEW.departed_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  IF OLD.departed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  send_at := NEW.departed_at + interval '15 minutes';
  rating_deadline := LEAST(NEW.expires_at, NEW.created_at + interval '48 hours');

  IF send_at >= rating_deadline THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = NEW.user_id
      AND n.type = 'visita_avaliacao_pos_saida'
      AND (n.metadata->>'service_visit_id') = NEW.id::text
  ) THEN
    RETURN NEW;
  END IF;

  SELECT ps.name INTO svc_name
  FROM public.public_services ps
  WHERE ps.id = NEW.service_id
  LIMIT 1;

  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    action_url,
    priority,
    metadata,
    scheduled_for,
    is_read,
    created_at
  ) VALUES (
    NEW.user_id,
    COALESCE('Avaliar: ' || NULLIF(trim(svc_name), ''), 'Avaliar serviço visitado'),
    'Que tal avaliar o equipamento público que você passou? Sua opinião ajuda a cidade.',
    'visita_avaliacao_pos_saida',
    '/avaliar/' || NEW.id::text,
    'default',
    jsonb_build_object(
      'service_visit_id', NEW.id::text,
      'service_id', NEW.service_id::text
    ),
    send_at,
    false,
    now()
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.schedule_post_visit_rating_notification IS
  'RN-AVA-002: agenda notifications.scheduled_for = departed_at + 15 min se antes do fim da janela de avaliação (48h desde created_at e expires_at).';

DROP TRIGGER IF EXISTS tr_service_visits_schedule_post_visit_notification ON public.service_visits;
CREATE TRIGGER tr_service_visits_schedule_post_visit_notification
  AFTER UPDATE OF departed_at ON public.service_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_post_visit_rating_notification();
