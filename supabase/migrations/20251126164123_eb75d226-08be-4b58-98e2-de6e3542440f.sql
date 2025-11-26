-- Criar tabela de curtidas em relatos urbanos
CREATE TABLE public.urban_report_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.urban_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, user_id)
);

-- Criar tabela de comentários em relatos urbanos
CREATE TABLE public.urban_report_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.urban_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.urban_report_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urban_report_comments ENABLE ROW LEVEL SECURITY;

-- Políticas para curtidas
CREATE POLICY "Anyone can view likes"
  ON public.urban_report_likes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own likes"
  ON public.urban_report_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.urban_report_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para comentários
CREATE POLICY "Anyone can view comments"
  ON public.urban_report_comments
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON public.urban_report_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.urban_report_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.urban_report_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at em comentários
CREATE TRIGGER update_urban_report_comments_updated_at
  BEFORE UPDATE ON public.urban_report_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_urban_report_likes_report_id ON public.urban_report_likes(report_id);
CREATE INDEX idx_urban_report_likes_user_id ON public.urban_report_likes(user_id);
CREATE INDEX idx_urban_report_comments_report_id ON public.urban_report_comments(report_id);
CREATE INDEX idx_urban_report_comments_user_id ON public.urban_report_comments(user_id);