-- Tabela para inscrições/participações em audiências (formato CMSP: videoconferência e manifestação escrita)
-- Permite envio sem login (user_id opcional)
CREATE TABLE IF NOT EXISTS public.audiencia_participacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audiencia_id UUID NOT NULL REFERENCES public.audiencias(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('videoconferencia', 'escrito')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  entidade TEXT,
  funcao TEXT,
  bairro TEXT,
  sugestao TEXT,
  consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audiencia_participacoes_audiencia ON public.audiencia_participacoes(audiencia_id);
CREATE INDEX IF NOT EXISTS idx_audiencia_participacoes_email ON public.audiencia_participacoes(email);

ALTER TABLE public.audiencia_participacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert participacoes"
  ON public.audiencia_participacoes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own participacoes"
  ON public.audiencia_participacoes FOR SELECT
  USING (auth.uid() = user_id);
