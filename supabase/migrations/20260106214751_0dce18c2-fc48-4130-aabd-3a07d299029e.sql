-- ==============================================
-- Sistema de Notificações Segmentado Admin vs Cidadão
-- ==============================================

-- Função auxiliar para notificar todos os admins/moderadores
CREATE OR REPLACE FUNCTION public.notify_admins(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, action_url, priority, metadata)
  SELECT ur.user_id, p_title, p_message, p_type, p_action_url, p_priority, p_metadata
  FROM user_roles ur
  WHERE ur.role IN ('admin', 'moderator');
END;
$$;

-- ==============================================
-- Trigger: Novo Relato Urbano (notifica admins + cidadão)
-- ==============================================
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
  -- Verificar se é crítico (severidade >= 4)
  IF NEW.severity IS NOT NULL AND NEW.severity >= 4 THEN
    v_priority := 'high';
    v_type := 'critical_report';
  END IF;

  -- Notificar admins
  PERFORM notify_admins(
    'Novo Relato Urbano',
    'Categoria: ' || COALESCE(NEW.category, 'Não informada') || ' - ' || COALESCE(NEW.subcategory, ''),
    v_type,
    '/admin/reports?type=urban&id=' || NEW.id,
    v_priority,
    jsonb_build_object('report_id', NEW.id, 'category', NEW.category, 'subcategory', NEW.subcategory)
  );

  -- Notificar cidadão que enviou
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

DROP TRIGGER IF EXISTS trigger_urban_report_created ON urban_reports;
CREATE TRIGGER trigger_urban_report_created
  AFTER INSERT ON urban_reports
  FOR EACH ROW
  EXECUTE FUNCTION on_urban_report_created();

-- ==============================================
-- Trigger: Novo Relato de Transporte (notifica admins + cidadão)
-- ==============================================
CREATE OR REPLACE FUNCTION public.on_transport_report_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notificar admins
  PERFORM notify_admins(
    'Novo Relato de Transporte',
    'Linha: ' || COALESCE(NEW.line_name, 'Não informada') || ' - ' || COALESCE(NEW.problem_type, 'Problema'),
    'new_transport_report',
    '/admin/reports?type=transport&id=' || NEW.id,
    'normal',
    jsonb_build_object('report_id', NEW.id, 'line', NEW.line_name, 'problem_type', NEW.problem_type)
  );

  -- Notificar cidadão
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

DROP TRIGGER IF EXISTS trigger_transport_report_created ON transport_reports;
CREATE TRIGGER trigger_transport_report_created
  AFTER INSERT ON transport_reports
  FOR EACH ROW
  EXECUTE FUNCTION on_transport_report_created();

-- ==============================================
-- Trigger: Novo Usuário Cadastrado (notifica admins)
-- ==============================================
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
    jsonb_build_object('user_id', NEW.id, 'name', NEW.full_name)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_new_user_profile ON profiles;
CREATE TRIGGER trigger_new_user_profile
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION on_new_user_profile();