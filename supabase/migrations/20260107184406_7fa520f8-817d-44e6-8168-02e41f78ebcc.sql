-- Drop and recreate the trigger function with correct logic
CREATE OR REPLACE FUNCTION public.on_urban_report_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_priority TEXT := 'normal';
  v_type TEXT := 'new_urban_report';
BEGIN
  -- Verificar se é crítico baseado em risk_level (não severity)
  IF NEW.risk_level IS NOT NULL AND NEW.risk_level = 'critical' THEN
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
    jsonb_build_object(
      'report_id', NEW.id, 
      'category', NEW.category, 
      'subcategory', NEW.subcategory,
      'risk_level', NEW.risk_level
    )
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