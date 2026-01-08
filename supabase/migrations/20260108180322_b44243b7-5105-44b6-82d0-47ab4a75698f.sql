CREATE OR REPLACE FUNCTION public.on_transport_report_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  line_display TEXT;
BEGIN
  -- Get line display name from transport_lines or use custom code
  SELECT COALESCE(tl.line_code || ' - ' || tl.line_name, NEW.line_code_custom, 'Não informada')
  INTO line_display
  FROM transport_lines tl
  WHERE tl.id = NEW.line_id;
  
  IF line_display IS NULL THEN
    line_display := COALESCE(NEW.line_code_custom, 'Não informada');
  END IF;

  -- Notificar admins
  PERFORM notify_admins(
    'Novo Relato de Transporte',
    'Linha: ' || line_display || ' - ' || COALESCE(NEW.report_type, 'Problema'),
    'new_transport_report',
    '/admin/reports?type=transport&id=' || NEW.id,
    'normal',
    jsonb_build_object('report_id', NEW.id, 'line', line_display, 'report_type', NEW.report_type)
  );

  -- Notificar cidadão
  IF NEW.user_id IS NOT NULL THEN
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

  RETURN NEW;
END;
$function$;