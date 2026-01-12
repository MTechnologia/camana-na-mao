-- =============================================
-- SISTEMA DE APRENDIZADO CONTÍNUO DO CIDADÃO
-- =============================================

-- 1. Perfil de Aprendizado do Cidadão
CREATE TABLE IF NOT EXISTS public.citizen_learning_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Localização preferida
  preferred_neighborhood TEXT,
  preferred_region TEXT,
  last_known_address JSONB,
  
  -- Padrões de relato
  common_categories TEXT[] DEFAULT '{}',
  common_keywords TEXT[] DEFAULT '{}',
  report_frequency TEXT DEFAULT 'occasional',
  
  -- Estilo de comunicação
  communication_style TEXT DEFAULT 'informal',
  avg_message_length INTEGER DEFAULT 50,
  prefers_short_responses BOOLEAN DEFAULT false,
  
  -- Serviços frequentes
  frequent_services TEXT[] DEFAULT '{}',
  frequent_transport_lines TEXT[] DEFAULT '{}',
  
  -- Métricas
  total_reports INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Categorias Dinâmicas (criadas automaticamente pelo sistema)
CREATE TABLE IF NOT EXISTS public.dynamic_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  category_key TEXT UNIQUE NOT NULL,
  parent_category TEXT NOT NULL DEFAULT 'outro',
  display_name TEXT NOT NULL,
  
  -- Detecção
  keywords TEXT[] NOT NULL DEFAULT '{}',
  description_patterns TEXT[] DEFAULT '{}',
  
  -- Métricas de uso
  usage_count INTEGER DEFAULT 1,
  first_detected_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  
  -- Status: pending, approved, rejected, merged
  status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  merged_into TEXT,
  
  -- Metadados
  sample_descriptions TEXT[] DEFAULT '{}',
  ai_confidence NUMERIC(3,2) DEFAULT 0.7,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Log de Uso de Categorias (para detectar padrões emergentes)
CREATE TABLE IF NOT EXISTS public.category_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  subcategory TEXT,
  description_hash TEXT NOT NULL,
  description_sample TEXT,
  keywords_detected TEXT[] DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_citizen_learning_user ON public.citizen_learning_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_categories_keywords ON public.dynamic_categories USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_dynamic_categories_status ON public.dynamic_categories(status);
CREATE INDEX IF NOT EXISTS idx_dynamic_categories_parent ON public.dynamic_categories(parent_category);
CREATE INDEX IF NOT EXISTS idx_category_usage_created ON public.category_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_category_usage_category ON public.category_usage_log(category);

-- RLS Policies
ALTER TABLE public.citizen_learning_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_usage_log ENABLE ROW LEVEL SECURITY;

-- Citizen Learning Profile: usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own learning profile" 
  ON public.citizen_learning_profile FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert learning profiles" 
  ON public.citizen_learning_profile FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update learning profiles" 
  ON public.citizen_learning_profile FOR UPDATE 
  USING (auth.uid() = user_id);

-- Dynamic Categories: admins podem gerenciar, todos podem ler aprovadas
CREATE POLICY "Anyone can view approved categories" 
  ON public.dynamic_categories FOR SELECT 
  USING (status = 'approved' OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'gestor')
  ));

CREATE POLICY "Admins can manage categories" 
  ON public.dynamic_categories FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'gestor')
  ));

CREATE POLICY "System can insert categories" 
  ON public.dynamic_categories FOR INSERT 
  WITH CHECK (true);

-- Category Usage Log: sistema pode inserir, admins podem ver
CREATE POLICY "System can insert usage logs" 
  ON public.category_usage_log FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Admins can view usage logs" 
  ON public.category_usage_log FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'gestor')
  ));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_citizen_learning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_citizen_learning_updated_at
  BEFORE UPDATE ON public.citizen_learning_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_citizen_learning_updated_at();