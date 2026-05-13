-- HU-9 UX: deep-links específicos para notificações de acompanhamento em transporte.

CREATE OR REPLACE FUNCTION public.on_transport_report_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  line_display text;
  v_already_notified boolean;
BEGIN
  SELECT coalesce(tl.line_code || ' - ' || tl.line_name, NEW.line_code_custom, 'Não informada')
  INTO line_display
  FROM transport_lines tl
  WHERE tl.id = NEW.line_id;

  IF line_display IS NULL THEN
    line_display := coalesce(NEW.line_code_custom, 'Não informada');
  END IF;

  PERFORM notify_admins(
    'Novo Relato de Transporte',
    'Linha: ' || line_display || ' - ' || coalesce(NEW.report_type, 'Problema'),
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

  IF NEW.line_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url, priority, metadata)
    SELECT
      ts.user_id,
      'Novo relato numa linha que você acompanha',
      'Há um novo relato sobre "' || line_display || '". Veja em Transporte.',
      'transporte_linha_relato',
      '/transporte/meus-relatos?reportId=' || NEW.id::text,
      'normal',
      jsonb_build_object('report_id', NEW.id, 'line_id', NEW.line_id)
    FROM public.transport_subscriptions ts
    WHERE ts.line_id = NEW.line_id
      AND ts.subscription_type = 'alert'
      AND ts.user_id IS DISTINCT FROM NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.on_transport_report_created IS
  'Admin + confirmação ao autor + HU-9.3 notificação a inscritos da linha com deep-link direto para o relato.';

CREATE OR REPLACE FUNCTION public.notify_transport_subscribers_on_pattern_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  line_display text;
BEGIN
  IF NEW.line_id IS NULL OR NEW.status IS DISTINCT FROM 'active' THEN
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
    '/transporte/padroes?patternId=' || NEW.id::text || '&lineId=' || NEW.line_id::text,
    'normal',
    jsonb_build_object(
      'pattern_id', NEW.id,
      'line_id', NEW.line_id,
      'pattern_type', NEW.pattern_type
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

COMMENT ON FUNCTION public.notify_transport_subscribers_on_pattern_insert IS
  'HU-9.4: notifica inscritos (alert) na linha ao inserir padrão ativo, com deep-link para o padrão destacado.';
