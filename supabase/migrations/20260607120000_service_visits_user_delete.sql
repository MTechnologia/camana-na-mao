-- Permite ao cidadão remover visitas do próprio histórico (LGPD / preferências de privacidade).
-- service_ratings.visit_id referencia service_visits com ON DELETE CASCADE.

CREATE POLICY "Users can delete their own visits"
  ON public.service_visits
  FOR DELETE
  USING (auth.uid() = user_id);
