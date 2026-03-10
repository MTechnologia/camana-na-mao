-- Notificação quando o usuário se inscreve para receber LEMBRETES de audiência (audiencia_inscricoes)
-- e quando uma nova NOTÍCIA é publicada (noticias) → push/e-mail na bandeja para quem tem notificações ativas

-- 1) Inscrição em lembretes de audiência (audiencia_inscricoes)
CREATE OR REPLACE FUNCTION public.notify_audiencia_inscricao_lembrete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo TEXT;
  v_data DATE;
  v_action_url TEXT;
BEGIN
  SELECT a.titulo, a.data
    INTO v_titulo, v_data
    FROM public.audiencias a
    WHERE a.id = NEW.audiencia_id;
  IF v_titulo IS NOT NULL THEN
    v_action_url := '/audiencias/' || NEW.audiencia_id;
    INSERT INTO public.notifications (user_id, title, message, type, action_url, priority, metadata)
    VALUES (
      NEW.user_id,
      'Inscrição para lembretes',
      'Você se inscreveu para receber lembretes da audiência: ' || left(v_titulo, 100)
        || CASE WHEN v_data IS NOT NULL THEN ' (dia ' || to_char(v_data, 'DD/MM/YYYY') || ').' ELSE '.' END,
      'audiencia_inscricao',
      v_action_url,
      'normal',
      jsonb_build_object('audiencia_id', NEW.audiencia_id, 'inscricao_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_audiencia_inscricao_lembrete ON public.audiencia_inscricoes;
CREATE TRIGGER after_audiencia_inscricao_lembrete
  AFTER INSERT ON public.audiencia_inscricoes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_audiencia_inscricao_lembrete();

COMMENT ON FUNCTION public.notify_audiencia_inscricao_lembrete IS 'Cria notificação quando o usuário se inscreve para lembretes de audiência (audiencia_inscricoes).';


-- 2) Nova notícia publicada → notificar usuários com push ou e-mail ativo
CREATE OR REPLACE FUNCTION public.notify_new_noticia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo TEXT := left(NEW.titulo, 120);
  v_resumo TEXT := coalesce(nullif(trim(NEW.resumo), ''), left(regexp_replace(NEW.conteudo, '<[^>]+>', '', 'g'), 200));
  v_action_url TEXT := '/institucional/noticias/' || NEW.id;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, action_url, priority, metadata)
  SELECT
    ns.user_id,
    'Nova notícia: ' || v_titulo,
    v_resumo,
    'general',
    v_action_url,
    'normal',
    jsonb_build_object('noticia_id', NEW.id, 'categoria', NEW.categoria)
  FROM public.notification_settings ns
  WHERE (ns.push_enabled = true OR ns.email_enabled = true)
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ns.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_noticia_insert_notify ON public.noticias;
CREATE TRIGGER after_noticia_insert_notify
  AFTER INSERT ON public.noticias
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_noticia();

COMMENT ON FUNCTION public.notify_new_noticia IS 'Ao publicar uma nova notícia, cria notificação para todos os usuários com push ou e-mail ativo (bandeja do celular, e-mail, etc.).';
