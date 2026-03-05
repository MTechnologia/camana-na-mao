-- Garantir que notify_admins exista com 7 parâmetros (p_exclude_user_id), exigido pelos triggers abaixo.
-- Se a migration 20260228180000_notify_admins_exclude_report_author já tiver sido aplicada, isto só reaplica a mesma definição.
CREATE OR REPLACE FUNCTION public.notify_admins(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_exclude_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, action_url, priority, metadata)
  SELECT ur.user_id, p_title, p_message, p_type, p_action_url, p_priority, p_metadata
  FROM user_roles ur
  WHERE ur.role IN ('admin'::app_role, 'gestor'::app_role)
    AND (p_exclude_user_id IS NULL OR ur.user_id != p_exclude_user_id);
END;
$$;

-- Evitar notificação duplicada "Relato Recebido com Sucesso" para o mesmo relato (ex.: insert duplicado ou retry).
-- Só insere notificação ao cidadão se não existir uma igual (mesmo user_id, type report_received, mesmo report_id) nos últimos 60 segundos.
CREATE OR REPLACE FUNCTION public.on_urban_report_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_priority TEXT := 'normal';
  v_type TEXT := 'new_urban_report';
  v_already_notified BOOLEAN;
BEGIN
  IF NEW.risk_level IS NOT NULL AND NEW.risk_level = 'critical' THEN
    v_priority := 'high';
    v_type := 'critical_report';
  END IF;

  PERFORM notify_admins(
    'Novo Relato Urbano',
    'Categoria: ' || COALESCE(NEW.category, 'Não informada') || ' - ' || COALESCE(NEW.subcategory, ''),
    v_type,
    '/admin/reports?type=urban&id=' || NEW.id,
    v_priority,
    jsonb_build_object(
      'report_id', NEW.id,
      'category', NEW.category,
      'subcategory', NEW.subcategory,
      'risk_level', NEW.risk_level
    ),
    NEW.user_id
  );

  IF NEW.user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = NEW.user_id
        AND type = 'report_received'
        AND metadata->>'report_id' = NEW.id::text
        AND created_at > (now() - interval '60 seconds')
    ) INTO v_already_notified;
    IF NOT v_already_notified THEN
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
  END IF;

  RETURN NEW;
END;
$$;

-- Mesma proteção para relato de transporte: evita "Relato de Transporte Recebido" duplicado.
CREATE OR REPLACE FUNCTION public.on_transport_report_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  line_display TEXT;
  v_already_notified BOOLEAN;
BEGIN
  SELECT COALESCE(tl.line_code || ' - ' || tl.line_name, NEW.line_code_custom, 'Não informada')
  INTO line_display
  FROM transport_lines tl
  WHERE tl.id = NEW.line_id;

  IF line_display IS NULL THEN
    line_display := COALESCE(NEW.line_code_custom, 'Não informada');
  END IF;

  PERFORM notify_admins(
    'Novo Relato de Transporte',
    'Linha: ' || line_display || ' - ' || COALESCE(NEW.report_type, 'Problema'),
    'new_transport_report',
    '/admin/reports?type=transport&id=' || NEW.id,
    'normal',
    jsonb_build_object('report_id', NEW.id, 'line', line_display, 'report_type', NEW.report_type),
    NEW.user_id
  );

  IF NEW.user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = NEW.user_id
        AND type = 'report_received'
        AND metadata->>'report_id' = NEW.id::text
        AND created_at > (now() - interval '60 seconds')
    ) INTO v_already_notified;
    IF NOT v_already_notified THEN
      INSERT INTO notifications (user_id, title, message, type, action_url, priority, metadata)
      VALUES (
        NEW.user_id,
        'Relato de Transporte Recebido',
        'Seu relato sobre a linha "' || line_display || '" foi registrado com sucesso.',
        'report_received',
        '/transporte/meus-relatos',
        'normal',
        jsonb_build_object('report_id', NEW.id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
