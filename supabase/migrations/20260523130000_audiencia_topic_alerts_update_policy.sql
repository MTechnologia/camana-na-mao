-- UPSERT no cliente exige política UPDATE além de INSERT (ON CONFLICT DO UPDATE).

DROP POLICY IF EXISTS "Users can update their own topic alerts" ON public.audiencia_topic_alerts;

CREATE POLICY "Users can update their own topic alerts"
  ON public.audiencia_topic_alerts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
