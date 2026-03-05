-- Preferências de notificação para admin/gestor: novos usuários e novos relatos
-- Permite que cada admin/gestor escolha se recebe notificações de novos usuários e de novos relatos.

-- 1. Adicionar colunas em user_preferences (default true = comportamento atual)
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS notify_new_users boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_new_reports boolean NOT NULL DEFAULT true;

-- 2. notify_admins com filtro por tipo de notificação
-- p_notification_kind: NULL = notificar todos; 'new_user' = só quem tem notify_new_users; 'new_report' = só quem tem notify_new_reports
CREATE OR REPLACE FUNCTION public.notify_admins(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_notification_kind TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, action_url, priority, metadata)
  SELECT ur.user_id, p_title, p_message, p_type, p_action_url, p_priority, p_metadata
  FROM user_roles ur
  LEFT JOIN user_preferences up ON up.user_id = ur.user_id
  WHERE ur.role IN ('admin'::app_role, 'gestor'::app_role)
    AND (
      p_notification_kind IS NULL
      OR (p_notification_kind = 'new_user' AND COALESCE(up.notify_new_users, true))
      OR (p_notification_kind = 'new_report' AND COALESCE(up.notify_new_reports, true))
    );
END;
$$;

-- 3. Trigger: novo usuário -> passar 'new_user'
CREATE OR REPLACE FUNCTION public.on_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_admins(
    'Novo Usuário Cadastrado',
    COALESCE(NEW.full_name, 'Usuário') || ' se cadastrou na plataforma.',
    'new_user',
    '/admin/users',
    'low',
    jsonb_build_object('user_id', NEW.id, 'name', NEW.full_name),
    'new_user'
  );
  RETURN NEW;
END;
$$;

-- 4. Trigger: novo relato urbano -> passar 'new_report'
CREATE OR REPLACE FUNCTION public.on_urban_report_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_priority TEXT := 'normal';
  v_type TEXT := 'new_urban_report';
BEGIN
  IF NEW.severity IS NOT NULL AND NEW.severity >= 4 THEN
    v_priority := 'high';
    v_type := 'critical_report';
  END IF;

  PERFORM notify_admins(
    'Novo Relato Urbano',
    'Categoria: ' || COALESCE(NEW.category, 'Não informada') || ' - ' || COALESCE(NEW.subcategory, ''),
    v_type,
    '/admin/reports?type=urban&id=' || NEW.id,
    v_priority,
    jsonb_build_object('report_id', NEW.id, 'category', NEW.category, 'subcategory', NEW.subcategory),
    'new_report'
  );

  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, priority, metadata)
    VALUES (
      NEW.user_id,
      'Relato Recebido com Sucesso',
      'Seu relato sobre "' || COALESCE(NEW.subcategory, NEW.category, 'problema urbano') || '" foi registrado. Acompanhe o status na área de histórico.',
      'report_received',
      '/relato-urbano/historico',
      'normal',
      jsonb_build_object('report_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Trigger: novo relato de transporte -> passar 'new_report'
CREATE OR REPLACE FUNCTION public.on_transport_report_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_admins(
    'Novo Relato de Transporte',
    'Linha: ' || COALESCE(NEW.line_name, 'Não informada') || ' - ' || COALESCE(NEW.problem_type, 'Problema'),
    'new_transport_report',
    '/admin/reports?type=transport&id=' || NEW.id,
    'normal',
    jsonb_build_object('report_id', NEW.id, 'line', NEW.line_name, 'problem_type', NEW.problem_type),
    'new_report'
  );

  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, priority, metadata)
    VALUES (
      NEW.user_id,
      'Relato de Transporte Recebido',
      'Seu relato sobre a linha "' || COALESCE(NEW.line_name, 'transporte') || '" foi registrado com sucesso.',
      'report_received',
      '/transporte/meus-relatos',
      'normal',
      jsonb_build_object('report_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;
