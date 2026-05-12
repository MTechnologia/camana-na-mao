-- Entrega interna de avisos por tema de audiência:
-- 1) novas audiências futuras/agendadas disparam notificação automaticamente;
-- 2) ao criar a inscrição por tema, podemos fazer backfill das audiências já existentes.

COMMENT ON TABLE public.audiencia_topic_alerts IS
  'Temas para os quais o usuário quer receber aviso quando houver novas audiências. A entrega é automática por trigger em audiencias, com backfill opcional via process_audiencia_topic_alerts().';

CREATE OR REPLACE FUNCTION public.enqueue_audiencia_topic_alert_notifications(
  p_audiencia_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_audiencia RECORD;
  v_inserted_count integer := 0;
BEGIN
  SELECT
    a.id,
    a.titulo,
    a.tema,
    a.data,
    a.hora,
    a.status
  INTO v_audiencia
  FROM public.audiencias a
  WHERE a.id = p_audiencia_id;

  IF v_audiencia.id IS NULL THEN
    RETURN 0;
  END IF;

  IF v_audiencia.data < current_date
     OR coalesce(v_audiencia.status, '') NOT IN ('agendada', 'scheduled') THEN
    RETURN 0;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, action_url, priority, metadata)
  SELECT
    ata.user_id,
    'Nova audiência sobre ' || coalesce(nullif(trim(ata.tema), ''), v_audiencia.tema),
    left(
      'Foi identificada uma audiência agendada sobre ' ||
      coalesce(nullif(trim(ata.tema), ''), v_audiencia.tema) ||
      ': ' || coalesce(v_audiencia.titulo, 'veja os detalhes no app.') ||
      CASE
        WHEN v_audiencia.data IS NOT NULL THEN ' (dia ' || to_char(v_audiencia.data, 'DD/MM/YYYY') || ').'
        ELSE '.'
      END,
      500
    ),
    'audiencia_topic_alert',
    '/audiencias/' || v_audiencia.id::text,
    'normal',
    jsonb_build_object(
      'audiencia_id', v_audiencia.id,
      'tema', ata.tema,
      'audiencia_tema', v_audiencia.tema,
      'audiencia_data', v_audiencia.data
    )
  FROM public.audiencia_topic_alerts ata
  WHERE (p_user_id IS NULL OR ata.user_id = p_user_id)
    AND nullif(trim(ata.tema), '') IS NOT NULL
    AND (
      v_audiencia.tema ILIKE '%' || trim(ata.tema) || '%'
      OR v_audiencia.titulo ILIKE '%' || trim(ata.tema) || '%'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = ata.user_id
        AND n.type = 'audiencia_topic_alert'
        AND coalesce(n.metadata->>'audiencia_id', '') = v_audiencia.id::text
    );

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$;

COMMENT ON FUNCTION public.enqueue_audiencia_topic_alert_notifications(UUID, UUID) IS
  'Insere notificações audiencia_topic_alert para uma audiência futura/agendada e evita duplicidade por usuário + audiência.';

CREATE OR REPLACE FUNCTION public.backfill_audiencia_topic_alert_notifications_for_user(
  p_user_id UUID,
  p_tema TEXT
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  r RECORD;
  v_total integer := 0;
BEGIN
  IF p_user_id IS NULL OR nullif(trim(p_tema), '') IS NULL THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT a.id
    FROM public.audiencias a
    WHERE a.data >= current_date
      AND coalesce(a.status, '') IN ('agendada', 'scheduled')
      AND (
        a.tema ILIKE '%' || trim(p_tema) || '%'
        OR a.titulo ILIKE '%' || trim(p_tema) || '%'
      )
    ORDER BY a.data, a.hora NULLS FIRST
    LIMIT 5
  LOOP
    v_total := v_total + public.enqueue_audiencia_topic_alert_notifications(r.id, p_user_id);
  END LOOP;

  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.backfill_audiencia_topic_alert_notifications_for_user(UUID, TEXT) IS
  'Ao salvar uma inscrição por tema, cria notificações pendentes para até 5 audiências futuras já existentes que combinem com o tema.';

CREATE OR REPLACE FUNCTION public.notify_audiencia_topic_alerts_on_audiencia_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.enqueue_audiencia_topic_alert_notifications(NEW.id);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_audiencia_topic_alerts_on_audiencia_change() IS
  'Dispara entrega interna de audiencia_topic_alert quando uma audiência futura/agendada é inserida ou atualizada.';

DROP TRIGGER IF EXISTS tr_notify_audiencia_topic_alerts ON public.audiencias;
CREATE TRIGGER tr_notify_audiencia_topic_alerts
  AFTER INSERT OR UPDATE OF titulo, tema, data, hora, status ON public.audiencias
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_audiencia_topic_alerts_on_audiencia_change();

CREATE OR REPLACE FUNCTION public.process_audiencia_topic_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT a.id
    FROM public.audiencias a
    WHERE a.data >= current_date
      AND coalesce(a.status, '') IN ('agendada', 'scheduled')
  LOOP
    PERFORM public.enqueue_audiencia_topic_alert_notifications(r.id);
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.process_audiencia_topic_alerts IS
  'Backfill/manual: percorre audiências futuras/agendadas e cria notificações audiencia_topic_alert ainda não geradas.';

GRANT EXECUTE ON FUNCTION public.enqueue_audiencia_topic_alert_notifications(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.backfill_audiencia_topic_alert_notifications_for_user(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_audiencia_topic_alerts() TO service_role;
