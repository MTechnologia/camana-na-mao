-- Correções: registro oficial só deve ser tratado após aprovação explícita.
-- "applied" confirma que o cadastro já foi atualizado e só é permitido após "approved".

CREATE OR REPLACE FUNCTION public.enforce_service_correction_applied_after_approved()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status = 'applied' AND OLD.status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION
      'service_corrections: status "applied" só é permitido após "approved" (aprovação prévia).';
  END IF;
  RETURN NEW;
END;
$f$;

COMMENT ON FUNCTION public.enforce_service_correction_applied_after_approved() IS
  'Impede pending→applied direto; exige aprovação antes de marcar como refletida no cadastro oficial.';

DROP TRIGGER IF EXISTS tr_service_corrections_applied_requires_approved ON public.service_corrections;
CREATE TRIGGER tr_service_corrections_applied_requires_approved
  BEFORE UPDATE OF status ON public.service_corrections
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_service_correction_applied_after_approved();

-- Notificações: pendente→aceita/recusada; depois aceita→aplicada (segunda mensagem ao munícipe).

CREATE OR REPLACE FUNCTION public.notify_service_correction_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $f$
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

  SELECT ps.name INTO v_equipment_name
  FROM public.public_services ps
  WHERE ps.id = NEW.service_id
  LIMIT 1;

  v_equipment_name := COALESCE(NULLIF(trim(v_equipment_name), ''), 'este equipamento');

  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    v_title := 'Sugestão de correção aceita';
    v_message :=
      'Sua sugestão sobre o cadastro de "' || v_equipment_name ||
      '" foi aceita pela equipe. O cadastro oficial será atualizado em seguida; você receberá outra notificação quando estiver refletido no app.';
  ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    v_title := 'Sugestão de correção não aplicada';
    v_message :=
      'Sua sugestão sobre "' || v_equipment_name ||
      '" foi analisada e não será aplicada neste momento. Se quiser, envie uma nova sugestão com mais detalhes.';
  ELSIF OLD.status = 'approved' AND NEW.status = 'applied' THEN
    v_title := 'Correção registrada no cadastro';
    v_message :=
      'Sua sugestão sobre "' || v_equipment_name ||
      '" foi refletida no cadastro oficial. Obrigado por ajudar a manter as informações atualizadas!';
  ELSE
    RETURN NEW;
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
$f$;

COMMENT ON FUNCTION public.notify_service_correction_author() IS
  'Notifica o autor: pending→approved/rejected; approved→applied (cadastro atualizado).';
