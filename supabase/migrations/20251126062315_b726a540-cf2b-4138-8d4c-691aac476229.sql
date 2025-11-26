-- Tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);

-- RLS para notificações
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Tabela de preferências de notificação
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  max_daily_notifications INTEGER DEFAULT 10,
  categories_enabled TEXT[] DEFAULT ARRAY['legislativa', 'servico', 'transporte', 'urbano'],
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON public.notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Tabela de conversas com IA
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  context TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_last_message ON public.ai_conversations(last_message_at DESC);

-- RLS para conversas
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON public.ai_conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Tabela de audiências públicas
CREATE TABLE IF NOT EXISTS public.audiencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  local TEXT NOT NULL,
  tema TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendada',
  vagas_disponiveis INTEGER,
  inscricoes_abertas BOOLEAN DEFAULT true,
  link_transmissao TEXT,
  documentos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_audiencias_data ON public.audiencias(data DESC);
CREATE INDEX IF NOT EXISTS idx_audiencias_tema ON public.audiencias(tema);

-- RLS para audiências (público)
ALTER TABLE public.audiencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view audiencias"
  ON public.audiencias FOR SELECT
  USING (true);

-- Tabela de inscrições em audiências
CREATE TABLE IF NOT EXISTS public.audiencia_inscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audiencia_id UUID NOT NULL REFERENCES public.audiencias(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmada',
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(audiencia_id, user_id)
);

-- RLS para inscrições
ALTER TABLE public.audiencia_inscricoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inscricoes"
  ON public.audiencia_inscricoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inscricoes"
  ON public.audiencia_inscricoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inscricoes"
  ON public.audiencia_inscricoes FOR DELETE
  USING (auth.uid() = user_id);

-- Tabela de notícias
CREATE TABLE IF NOT EXISTS public.noticias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  resumo TEXT,
  imagem_url TEXT,
  categoria TEXT NOT NULL,
  autor TEXT,
  fonte TEXT DEFAULT 'Portal CMSP',
  data_publicacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  destaque BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_noticias_data ON public.noticias(data_publicacao DESC);
CREATE INDEX IF NOT EXISTS idx_noticias_categoria ON public.noticias(categoria);
CREATE INDEX IF NOT EXISTS idx_noticias_destaque ON public.noticias(destaque) WHERE destaque = true;

-- RLS para notícias (público)
ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view noticias"
  ON public.noticias FOR SELECT
  USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audiencias_updated_at
  BEFORE UPDATE ON public.audiencias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;