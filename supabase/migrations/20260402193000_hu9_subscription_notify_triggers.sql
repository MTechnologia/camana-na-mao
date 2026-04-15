-- HU-9: notificar inscritos quando há avaliação publicada, novo relato de transporte na linha,
-- ou padrão detectado na linha (com throttle anti-spam no padrão).

-- ---------------------------------------------------------------------------
-- 9.1 — Nova avaliação publicada → service_subscriptions (exceto autor)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_service_subscribers_on_rating_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_name text;
  v_should_notify boolean;
BEGIN
  v_should_notify :=
    (TG_OP = 'INSERT' AND NEW.publication_status = 'published')
    OR (
      TG_OP = 'UPDATE'
      AND NEW.publication_status = 'published'
      AND OLD.publication_status IS DISTINCT FROM 'published'
    );

  IF NOT v_should_notify THEN
    RETURN NEW;
  END IF;

  SELECT ps.name INTO v_service_name
  FROM public.public_services ps
  WHERE ps.id = NEW.service_id;

  INSERT INTO public.notifications (user_id, title, message, type, action_url, priority, metadata)
  SELECT
    ss.user_id,
    'Nova avaliação no equipamento',
    CASE
      WHEN v_service_name IS NOT NULL THEN
        'Foi publicada uma nova avaliação em **' || left(v_service_name, 100) || '**. Abra o equipamento para ver.'
      ELSE
        'Há uma nova avaliação publicada num equipamento que você acompanha.'
    END,
    'servico_nova_avaliacao',
    '/servico/' || NEW.service_id::text,
    'normal',
    jsonb_build_object('service_id', NEW.service_id, 'rating_id', NEW.id)
  FROM public.service_subscriptions ss
  WHERE ss.service_id = NEW.service_id
    AND ss.user_id IS DISTINCT FROM NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notify_service_subscribers_on_rating ON public.service_ratings;
CREATE TRIGGER tr_notify_service_subscribers_on_rating
  AFTER INSERT OR UPDATE ON public.service_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_service_subscribers_on_rating_published();

COMMENT ON FUNCTION public.notify_service_subscribers_on_rating_published IS
  'HU-9.1: ao publicar avaliação (published), notifica inscritos do serviço em service_subscriptions, exceto o autor.';


-- ---------------------------------------------------------------------------
-- 9.3 — Estende on_transport_report_created: inscritos na linha (exceto autor)
-- ---------------------------------------------------------------------------
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

  -- HU-9.3: quem acompanha a linha (alert) recebe aviso de novo relato alheio
  IF NEW.line_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url, priority, metadata)
    SELECT
      ts.user_id,
      'Novo relato numa linha que você acompanha',
      'Há um novo relato sobre "' || line_display || '". Veja em Transporte.',
      'transporte_linha_relato',
      '/transporte/historico',
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
  'Admin + confirmação ao autor + HU-9.3 notificação a inscritos da linha (transport_subscriptions, tipo alert).';


-- ---------------------------------------------------------------------------
-- 9.4 — Novo registro em report_patterns → inscritos na linha (throttle 24h)
-- ---------------------------------------------------------------------------
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
    '/transporte/padroes',
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

DROP TRIGGER IF EXISTS tr_notify_transport_subscribers_on_pattern ON public.report_patterns;
CREATE TRIGGER tr_notify_transport_subscribers_on_pattern
  AFTER INSERT ON public.report_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_transport_subscribers_on_pattern_insert();

COMMENT ON FUNCTION public.notify_transport_subscribers_on_pattern_insert IS
  'HU-9.4: notifica inscritos (alert) na linha ao inserir padrão ativo; no máximo 1 aviso por usuário/linha a cada 24h.';
