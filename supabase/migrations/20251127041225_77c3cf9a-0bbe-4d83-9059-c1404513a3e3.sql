-- FASE 1: Permitir admins visualizarem todas as notificações
CREATE POLICY "Admins can view all notifications"
ON notifications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- FASE 2: Permitir admins deletarem qualquer transport report
CREATE POLICY "Admins can delete any transport report"
ON transport_reports FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- FASE 4: Criar tabela para configurações do sistema
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage system settings
CREATE POLICY "Admins can manage system settings"
ON system_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view system settings (read-only for aplicação)
CREATE POLICY "Anyone can view system settings"
ON system_settings FOR SELECT
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
