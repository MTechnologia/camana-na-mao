-- Permitir que o próprio usuário insira notificação para si (ex.: boas-vindas no cadastro).
-- O envio por push/e-mail/SMS continua sendo feito pelo webhook em notifications (send-web-push).
-- Idempotente: não falha se a policy já existir.
DROP POLICY IF EXISTS "Users can insert notification for themselves" ON public.notifications;
CREATE POLICY "Users can insert notification for themselves"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
