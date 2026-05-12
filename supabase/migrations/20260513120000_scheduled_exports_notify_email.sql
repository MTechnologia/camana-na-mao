-- HU-8.2 — Envio automático do arquivo gerado por email
--
-- Adiciona a opção `notify_email` em `scheduled_exports`. Quando true (default),
-- ao concluir um export_job com source='scheduled' e storage_path preenchido, a
-- edge function `process-export-job` invoca `send-export-email`, que monta o
-- corpo HTML e envia ao dono do agendamento via SendGrid.
--
-- O envio in-app (notify_in_app, HU-8.1) e o email (notify_email, HU-8.2) são
-- independentes — o gestor pode habilitar ambos, um, ou nenhum.

ALTER TABLE public.scheduled_exports
  ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.scheduled_exports.notify_email IS
  'HU-8.2 — Quando true, envia o arquivo gerado por email ao dono do agendamento via SendGrid (link signed URL válido por 7 dias).';
