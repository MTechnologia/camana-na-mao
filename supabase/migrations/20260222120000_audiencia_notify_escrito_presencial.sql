-- Inclui manifestação por escrito e presencial na notificação de confirmação (push/bandeja e fluxo send-web-push).
-- Antes só videoconferência criava registro em notifications.

CREATE OR REPLACE FUNCTION public.notify_audiencia_inscricao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo TEXT;
  v_data DATE;
  v_action_url TEXT;
  v_tipo_label TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Só cria notificação se tiver user_id (usuário logado) e perfil existir
  IF NEW.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  IF NEW.tipo NOT IN ('videoconferencia', 'escrito', 'presencial') THEN
    RETURN NEW;
  END IF;

  SELECT a.titulo, a.data
    INTO v_titulo, v_data
    FROM public.audiencias a
    WHERE a.id = NEW.audiencia_id;

  IF v_titulo IS NULL THEN
    RETURN NEW;
  END IF;

  v_action_url := '/audiencias/' || NEW.audiencia_id;

  v_tipo_label := CASE NEW.tipo
    WHEN 'escrito' THEN 'manifestação por escrito'
    WHEN 'presencial' THEN 'participação presencial'
    ELSE 'videoconferência'
  END;

  v_title := CASE NEW.tipo
    WHEN 'escrito' THEN 'Manifestação enviada'
    WHEN 'presencial' THEN 'Inscrição presencial realizada'
    ELSE 'Inscrição realizada'
  END;

  v_message := 'Sua ' || v_tipo_label || ' foi registrada para a audiência: '
    || left(v_titulo, 100)
    || CASE WHEN v_data IS NOT NULL THEN ' (dia ' || to_char(v_data, 'DD/MM/YYYY') || ').' ELSE '. Confira no app.' END;

  INSERT INTO public.notifications (user_id, title, message, type, action_url, priority, metadata)
  VALUES (
    NEW.user_id,
    v_title,
    v_message,
    'audiencia_inscricao',
    v_action_url,
    'normal',
    jsonb_build_object('audiencia_id', NEW.audiencia_id, 'participacao_id', NEW.id, 'tipo', NEW.tipo)
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_audiencia_inscricao IS 'Cria notificação de confirmação quando o usuário se inscreve em audiência (videoconferência, manifestação por escrito ou presencial).';
