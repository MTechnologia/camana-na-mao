-- Fix ambiguous column reference by renaming PL/pgSQL variables with v_ prefix

CREATE OR REPLACE FUNCTION public.notify_citizen_on_referral()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_report_type text;
  v_report_title text;
BEGIN
  -- Determine which type of report and get the user_id
  IF NEW.transport_report_id IS NOT NULL THEN
    SELECT tr.user_id, tr.report_type INTO v_user_id, v_report_title
    FROM transport_reports tr
    WHERE tr.id = NEW.transport_report_id;
    v_report_type := 'transporte';
  ELSIF NEW.urban_report_id IS NOT NULL THEN
    SELECT ur.user_id, COALESCE(ur.subcategory, ur.category) INTO v_user_id, v_report_title
    FROM urban_reports ur
    WHERE ur.id = NEW.urban_report_id;
    v_report_type := 'urbano';
  ELSIF NEW.service_rating_id IS NOT NULL THEN
    SELECT sr.user_id INTO v_user_id
    FROM service_ratings sr
    WHERE sr.id = NEW.service_rating_id;
    v_report_type := 'serviço';
    v_report_title := 'Avaliação de serviço';
  END IF;

  -- Only create notification if we found a user
  IF v_user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      priority,
      action_url,
      metadata
    ) VALUES (
      v_user_id,
      'Seu relato foi encaminhado',
      'Seu relato de ' || v_report_type || ' foi encaminhado para o(a) vereador(a) ' || NEW.council_member_name || ' (' || COALESCE(NEW.council_member_party, 'sem partido') || ').',
      'referral',
      'high',
      CASE 
        WHEN NEW.transport_report_id IS NOT NULL THEN '/transporte/meus-relatos'
        WHEN NEW.urban_report_id IS NOT NULL THEN '/relato-urbano/historico'
        ELSE '/avaliar'
      END,
      jsonb_build_object(
        'referral_id', NEW.id,
        'council_member_name', NEW.council_member_name,
        'council_member_party', NEW.council_member_party,
        'report_type', v_report_type
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix the update trigger function as well
CREATE OR REPLACE FUNCTION public.notify_citizen_on_referral_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_report_type text;
  v_title text;
  v_message text;
BEGIN
  -- Only notify on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine which type of report and get the user_id
  IF NEW.transport_report_id IS NOT NULL THEN
    SELECT tr.user_id INTO v_user_id FROM transport_reports tr WHERE tr.id = NEW.transport_report_id;
    v_report_type := 'transporte';
  ELSIF NEW.urban_report_id IS NOT NULL THEN
    SELECT ur.user_id INTO v_user_id FROM urban_reports ur WHERE ur.id = NEW.urban_report_id;
    v_report_type := 'urbano';
  ELSIF NEW.service_rating_id IS NOT NULL THEN
    SELECT sr.user_id INTO v_user_id FROM service_ratings sr WHERE sr.id = NEW.service_rating_id;
    v_report_type := 'serviço';
  END IF;

  -- Set notification content based on new status
  CASE NEW.status
    WHEN 'sent' THEN
      v_title := 'Encaminhamento enviado';
      v_message := 'O encaminhamento do seu relato de ' || v_report_type || ' foi enviado ao(à) vereador(a) ' || NEW.council_member_name || '.';
    WHEN 'acknowledged' THEN
      v_title := 'Vereador(a) recebeu seu relato';
      v_message := 'O(A) vereador(a) ' || NEW.council_member_name || ' confirmou o recebimento do seu relato de ' || v_report_type || '.';
    WHEN 'resolved' THEN
      v_title := 'Seu encaminhamento foi resolvido';
      v_message := 'O(A) vereador(a) ' || NEW.council_member_name || ' marcou seu encaminhamento de ' || v_report_type || ' como resolvido.';
    ELSE
      RETURN NEW;
  END CASE;

  -- Create notification
  IF v_user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      priority,
      action_url,
      metadata
    ) VALUES (
      v_user_id,
      v_title,
      v_message,
      'referral_update',
      'normal',
      CASE 
        WHEN NEW.transport_report_id IS NOT NULL THEN '/transporte/meus-relatos'
        WHEN NEW.urban_report_id IS NOT NULL THEN '/relato-urbano/historico'
        ELSE '/avaliar'
      END,
      jsonb_build_object(
        'referral_id', NEW.id,
        'council_member_name', NEW.council_member_name,
        'new_status', NEW.status,
        'report_type', v_report_type
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;