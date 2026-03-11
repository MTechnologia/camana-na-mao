-- 1) Garantir trigger on_transport_report_created sem line_name (transport_reports não tem essa coluna).
--    Usar line_display de transport_lines (line_id) ou line_code_custom.
CREATE OR REPLACE FUNCTION public.on_transport_report_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
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

-- 2) Fotos em relatos de transporte (conforme relato urbano)
ALTER TABLE public.transport_reports
  ADD COLUMN IF NOT EXISTS photos TEXT[];

COMMENT ON COLUMN public.transport_reports.photos IS 'URLs das fotos anexadas (bucket urban-reports), até 3.';
