-- Notificação ao se inscrever em audiência (videoconferência) e suporte ao lembrete D-1

-- Função: ao inserir participação em videoconferência com user_id, cria notificação de confirmação
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
BEGIN
  IF NEW.tipo = 'videoconferencia' AND NEW.user_id IS NOT NULL THEN
    SELECT a.titulo, a.data
      INTO v_titulo, v_data
      FROM public.audiencias a
      WHERE a.id = NEW.audiencia_id;
    IF v_titulo IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id) THEN
      v_action_url := '/audiencias/' || NEW.audiencia_id;
      INSERT INTO public.notifications (user_id, title, message, type, action_url, priority, metadata)
      VALUES (
        NEW.user_id,
        'Inscrição realizada',
        'Você se inscreveu para a videoconferência: ' || left(v_titulo, 120) || ' '
          || CASE WHEN v_data IS NOT NULL THEN '(dia ' || to_char(v_data, 'DD/MM/YYYY') || ').' ELSE 'Confira os detalhes no app.' END,
        'audiencia_inscricao',
        v_action_url,
        'normal',
        jsonb_build_object('audiencia_id', NEW.audiencia_id, 'participacao_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_audiencia_participacao_inscricao ON public.audiencia_participacoes;
CREATE TRIGGER after_audiencia_participacao_inscricao
  AFTER INSERT ON public.audiencia_participacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_audiencia_inscricao();

COMMENT ON FUNCTION public.notify_audiencia_inscricao IS 'Cria notificação de confirmação quando o usuário se inscreve em videoconferência.';
