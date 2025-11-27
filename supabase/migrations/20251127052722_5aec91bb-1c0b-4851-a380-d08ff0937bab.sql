-- Permitir que admins insiram notificações para qualquer usuário
CREATE POLICY "Admins can insert notifications" 
ON public.notifications
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));