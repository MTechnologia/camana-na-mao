-- Tabela de Relatos Urbanos (CSU008)
CREATE TABLE IF NOT EXISTS public.urban_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  location_address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  ai_classification JSONB,
  photos TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.urban_reports ENABLE ROW LEVEL SECURITY;

-- Políticas para urban_reports
CREATE POLICY "Users can view their own reports"
  ON public.urban_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports"
  ON public.urban_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
  ON public.urban_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view reports for nearby functionality"
  ON public.urban_reports FOR SELECT
  USING (true);

-- Tabela de Sugestões de Correção (CSU007)
CREATE TABLE IF NOT EXISTS public.service_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  service_id UUID NOT NULL REFERENCES public.public_services(id),
  field_name TEXT NOT NULL,
  current_value TEXT,
  suggested_value TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_corrections ENABLE ROW LEVEL SECURITY;

-- Políticas para service_corrections
CREATE POLICY "Users can view their own corrections"
  ON public.service_corrections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create corrections"
  ON public.service_corrections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Tabela de Planejamento de Serviços (CSU009)
CREATE TABLE IF NOT EXISTS public.service_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  planned_date DATE,
  planned_time TIME,
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_plans ENABLE ROW LEVEL SECURITY;

-- Políticas para service_plans
CREATE POLICY "Users can view their own plans"
  ON public.service_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create plans"
  ON public.service_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans"
  ON public.service_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans"
  ON public.service_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Tabela de Itens do Plano
CREATE TABLE IF NOT EXISTS public.service_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.service_plans(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.public_services(id),
  order_index INTEGER DEFAULT 0,
  estimated_duration INTEGER,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.service_plan_items ENABLE ROW LEVEL SECURITY;

-- Políticas para service_plan_items
CREATE POLICY "Users can view items from their plans"
  ON public.service_plan_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.service_plans
    WHERE service_plans.id = service_plan_items.plan_id
    AND service_plans.user_id = auth.uid()
  ));

CREATE POLICY "Users can create items in their plans"
  ON public.service_plan_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.service_plans
    WHERE service_plans.id = service_plan_items.plan_id
    AND service_plans.user_id = auth.uid()
  ));

CREATE POLICY "Users can update items in their plans"
  ON public.service_plan_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.service_plans
    WHERE service_plans.id = service_plan_items.plan_id
    AND service_plans.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete items from their plans"
  ON public.service_plan_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.service_plans
    WHERE service_plans.id = service_plan_items.plan_id
    AND service_plans.user_id = auth.uid()
  ));

-- Tabela de Alertas e Lembretes
CREATE TABLE IF NOT EXISTS public.service_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  service_id UUID REFERENCES public.public_services(id),
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas para service_alerts
CREATE POLICY "Users can view their own alerts"
  ON public.service_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON public.service_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para updated_at em urban_reports
CREATE OR REPLACE FUNCTION public.handle_urban_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_urban_reports_updated_at
  BEFORE UPDATE ON public.urban_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_urban_reports_updated_at();