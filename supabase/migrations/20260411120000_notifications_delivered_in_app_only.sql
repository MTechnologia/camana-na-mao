-- RN-NOT-004: quando push/e-mail/SMS estão desabilitados nas preferências, a notificação
-- permanece no app mas não dispara canais externos; marca entrega "só in-app".

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS delivered_in_app_only BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.notifications.delivered_in_app_only IS
  'True quando send-web-push concluiu sem enviar por nenhum canal externo (preferências desligadas).';
