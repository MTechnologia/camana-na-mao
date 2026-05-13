-- HU-9.4: também notificar inscritos quando um padrão ativo for atualizado
-- pelo pipeline (upsert da janela), preservando o throttle de 24h por linha.

CREATE OR REPLACE FUNCTION public.notify_transport_subscribers_on_pattern_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  line_display text;
  v_should_notify boolean := false;
BEGIN
  IF NEW.line_id IS NULL OR NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_should_notify := true;
  ELSIF TG_OP = 'UPDATE' THEN
    v_should_notify :=
      OLD.status IS DISTINCT FROM 'active'
      OR OLD.line_id IS DISTINCT FROM NEW.line_id
      OR OLD.occurrence_count IS DISTINCT FROM NEW.occurrence_count
      OR OLD.average_severity IS DISTINCT FROM NEW.average_severity
      OR OLD.avg_severity IS DISTINCT FROM NEW.avg_severity
      OR OLD.last_occurrence_at IS DISTINCT FROM NEW.last_occurrence_at
      OR OLD.description IS DISTINCT FROM NEW.description
      OR OLD.suggested_action IS DISTINCT FROM NEW.suggested_action;
  END IF;

  IF NOT v_should_notify THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(tl.line_code || ' - ' || tl.line_name, 'Linha')
  INTO line_display
  FROM public.transport_lines tl
  WHERE tl.id = NEW.line_id;

  IF line_display IS NULL THEN
    line_display := 'Linha';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, action_url, priority, metadata)
  SELECT
    ts.user_id,
    'Padrão na linha que você acompanha',
    left(
      'Foi detectado um padrão em "' || line_display || '": ' || coalesce(NEW.description, 'veja em Padrões.'),
      500
    ),
    'transporte_linha_padrao',
    '/transporte/padroes',
    'normal',
    jsonb_build_object(
      'pattern_id', NEW.id,
      'line_id', NEW.line_id,
      'pattern_type', NEW.pattern_type,
      'window_start', NEW.window_start,
      'window_end', NEW.window_end,
      'trigger_op', TG_OP
    )
  FROM public.transport_subscriptions ts
  WHERE ts.line_id = NEW.line_id
    AND ts.subscription_type = 'alert'
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = ts.user_id
        AND n.type = 'transporte_linha_padrao'
        AND coalesce(n.metadata->>'line_id', '') = NEW.line_id::text
        AND n.created_at > (now() - interval '24 hours')
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notify_transport_subscribers_on_pattern ON public.report_patterns;
CREATE TRIGGER tr_notify_transport_subscribers_on_pattern
  AFTER INSERT OR UPDATE ON public.report_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_transport_subscribers_on_pattern_change();

COMMENT ON FUNCTION public.notify_transport_subscribers_on_pattern_change IS
  'HU-9.4: notifica inscritos (alert) da linha em insert e update relevante de padrão ativo; no máximo 1 aviso por usuário/linha a cada 24h.';
