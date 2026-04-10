-- Comentários em diagnósticos de transporte (paridade com urban_report_comments)
CREATE TABLE public.transport_report_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.transport_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_report_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view transport report comments"
  ON public.transport_report_comments
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create transport report comments"
  ON public.transport_report_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transport report comments"
  ON public.transport_report_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transport report comments"
  ON public.transport_report_comments
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_transport_report_comments_updated_at
  BEFORE UPDATE ON public.transport_report_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_transport_report_comments_report_id ON public.transport_report_comments(report_id);
CREATE INDEX idx_transport_report_comments_user_id ON public.transport_report_comments(user_id);
