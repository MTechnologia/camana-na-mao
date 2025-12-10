-- Adicionar campos de notificação faltantes em notification_settings
ALTER TABLE notification_settings 
  ADD COLUMN IF NOT EXISTS sms_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS newsletter_enabled boolean DEFAULT false;

-- Migrar dados existentes de user_preferences para notification_settings
INSERT INTO notification_settings (user_id, push_enabled, email_enabled, sms_enabled, newsletter_enabled)
SELECT 
  user_id,
  push_notifications,
  email_notifications,
  sms_notifications,
  newsletter
FROM user_preferences
WHERE user_id NOT IN (SELECT user_id FROM notification_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Trigger: Notificar quando status de relato urbano muda
CREATE OR REPLACE FUNCTION notify_urban_report_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, message, type, priority, action_url, metadata)
    VALUES (
      NEW.user_id,
      'Atualização no seu relato',
      'O status do seu relato de ' || COALESCE(NEW.subcategory, NEW.category) || ' foi atualizado para: ' || 
        CASE NEW.status 
          WHEN 'pending' THEN 'Pendente'
          WHEN 'in_progress' THEN 'Em andamento'
          WHEN 'resolved' THEN 'Resolvido'
          WHEN 'rejected' THEN 'Rejeitado'
          ELSE NEW.status 
        END,
      'urbano',
      CASE WHEN NEW.status = 'resolved' THEN 'normal' ELSE 'high' END,
      '/relato-urbano/historico',
      jsonb_build_object('report_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger para relatos urbanos
DROP TRIGGER IF EXISTS on_urban_report_status_change ON urban_reports;
CREATE TRIGGER on_urban_report_status_change
  AFTER UPDATE ON urban_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_urban_report_status_change();

-- Trigger: Notificar quando há resposta em relato de transporte
CREATE OR REPLACE FUNCTION notify_transport_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_report_type text;
BEGIN
  SELECT user_id, report_type INTO v_user_id, v_report_type 
  FROM transport_reports 
  WHERE id = NEW.report_id;
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, priority, action_url, metadata)
    VALUES (
      v_user_id,
      'Nova resposta no seu relato',
      'Seu relato de ' || COALESCE(v_report_type, 'transporte') || ' recebeu uma resposta oficial.',
      'transporte',
      'high',
      '/transporte/meus-relatos',
      jsonb_build_object('report_id', NEW.report_id, 'response_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger para respostas de transporte
DROP TRIGGER IF EXISTS on_transport_response_created ON transport_report_responses;
CREATE TRIGGER on_transport_response_created
  AFTER INSERT ON transport_report_responses
  FOR EACH ROW
  EXECUTE FUNCTION notify_transport_response();

-- Trigger: Notificar quando há novo comentário em relato urbano
CREATE OR REPLACE FUNCTION notify_urban_report_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_report_user_id uuid;
  v_report_category text;
BEGIN
  -- Get report owner (don't notify if commenter is the owner)
  SELECT user_id, COALESCE(subcategory, category) INTO v_report_user_id, v_report_category 
  FROM urban_reports 
  WHERE id = NEW.report_id;
  
  IF v_report_user_id IS NOT NULL AND v_report_user_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, title, message, type, priority, action_url, metadata)
    VALUES (
      v_report_user_id,
      'Novo comentário no seu relato',
      'Alguém comentou no seu relato de ' || COALESCE(v_report_category, 'problema urbano') || '.',
      'urbano',
      'normal',
      '/relato-urbano/historico',
      jsonb_build_object('report_id', NEW.report_id, 'comment_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger para comentários em relatos urbanos
DROP TRIGGER IF EXISTS on_urban_report_comment_created ON urban_report_comments;
CREATE TRIGGER on_urban_report_comment_created
  AFTER INSERT ON urban_report_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_urban_report_comment();

-- Trigger: Notificar quando status de relato de transporte muda
CREATE OR REPLACE FUNCTION notify_transport_report_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, message, type, priority, action_url, metadata)
    VALUES (
      NEW.user_id,
      'Atualização no seu relato de transporte',
      'O status do seu relato foi atualizado para: ' || 
        CASE NEW.status 
          WHEN 'pending' THEN 'Pendente'
          WHEN 'in_progress' THEN 'Em análise'
          WHEN 'resolved' THEN 'Resolvido'
          WHEN 'rejected' THEN 'Rejeitado'
          ELSE NEW.status 
        END,
      'transporte',
      CASE WHEN NEW.status = 'resolved' THEN 'normal' ELSE 'high' END,
      '/transporte/meus-relatos',
      jsonb_build_object('report_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger para relatos de transporte
DROP TRIGGER IF EXISTS on_transport_report_status_change ON transport_reports;
CREATE TRIGGER on_transport_report_status_change
  AFTER UPDATE ON transport_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_transport_report_status_change();