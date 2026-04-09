-- HU-5.4: apoios (curtidas) em diagnósticos de transporte — espelha urban_report_likes
CREATE TABLE public.transport_report_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.transport_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, user_id)
);

ALTER TABLE public.transport_report_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view transport report likes"
  ON public.transport_report_likes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own transport report likes"
  ON public.transport_report_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transport report likes"
  ON public.transport_report_likes
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_transport_report_likes_report_id ON public.transport_report_likes(report_id);
CREATE INDEX idx_transport_report_likes_user_id ON public.transport_report_likes(user_id);
