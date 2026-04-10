-- Notificar o munícipe quando a moderação alterar o status da sugestão de correção (pendente → aceita/recusada/aplicada).
-- SECURITY DEFINER: não depende de RLS de insert em notifications (só admin pode inserir para terceiros via cliente).

CREATE OR REPLACE FUNCTION public.notify_service_correction_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_title text;
  v_message text;
  v_equipment_name text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Só na transição a partir de pendente (evita renotificar em edições posteriores)
  IF OLD.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('approved', 'rejected', 'applied') THEN
    RETURN NEW;
  END IF;

  SELECT ps.name INTO v_equipment_name
  FROM public.public_services ps
  WHERE ps.id = NEW.service_id
  LIMIT 1;

  v_equipment_name := COALESCE(NULLIF(trim(v_equipment_name), ''), 'este equipamento');

  IF NEW.status = 'approved' THEN
    v_title := 'Sugestão de correção aceita';
    v_message :=
      'Sua sugestão sobre o cadastro de "' || v_equipment_name ||
      '" foi aceita pela equipe. Obrigado por contribuir!';
  ELSIF NEW.status = 'rejected' THEN
    v_title := 'Sugestão de correção não aplicada';
    v_message :=
      'Sua sugestão sobre "' || v_equipment_name ||
      '" foi analisada e não será aplicada neste momento. Se quiser, envie uma nova sugestão com mais detalhes.';
  ELSE
    v_title := 'Correção registrada no cadastro';
    v_message :=
      'Sua sugestão sobre "' || v_equipment_name ||
      '" foi marcada como aplicada no cadastro. Obrigado por ajudar a manter as informações atualizadas!';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, action_url, priority, metadata)
  VALUES (
    NEW.user_id,
    v_title,
    v_message,
    'service_correction',
    '/servico/' || NEW.service_id::text,
    'normal',
    jsonb_build_object(
      'service_correction_id', NEW.id,
      'service_id', NEW.service_id,
      'new_status', NEW.status
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_service_correction_author() IS
  'Envia notificação in-app ao autor quando status da sugestão de correção sai de pending.';

DROP TRIGGER IF EXISTS tr_service_corrections_notify_author ON public.service_corrections;
CREATE TRIGGER tr_service_corrections_notify_author
  AFTER UPDATE OF status ON public.service_corrections
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_service_correction_author();
