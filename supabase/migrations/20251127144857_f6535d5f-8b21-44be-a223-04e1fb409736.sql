-- Create a function to notify citizens when their reports are forwarded to council members
CREATE OR REPLACE FUNCTION public.notify_citizen_on_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_user_id uuid;
  report_type text;
  report_title text;
BEGIN
  -- Determine which type of report and get the user_id
  IF NEW.transport_report_id IS NOT NULL THEN
    SELECT user_id, report_type INTO report_user_id, report_title
    FROM transport_reports
    WHERE id = NEW.transport_report_id;
    report_type := 'transporte';
  ELSIF NEW.urban_report_id IS NOT NULL THEN
    SELECT user_id, COALESCE(subcategory, category) INTO report_user_id, report_title
    FROM urban_reports
    WHERE id = NEW.urban_report_id;
    report_type := 'urbano';
  ELSIF NEW.service_rating_id IS NOT NULL THEN
    SELECT user_id INTO report_user_id
    FROM service_ratings
    WHERE id = NEW.service_rating_id;
    report_type := 'serviço';
    report_title := 'Avaliação de serviço';
  END IF;

  -- Only create notification if we found a user
  IF report_user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      priority,
      action_url,
      metadata
    ) VALUES (
      report_user_id,
      'Seu relato foi encaminhado',
      'Seu relato de ' || report_type || ' foi encaminhado para o(a) vereador(a) ' || NEW.council_member_name || ' (' || COALESCE(NEW.council_member_party, 'sem partido') || ').',
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
        'report_type', report_type
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to fire on new referrals
DROP TRIGGER IF EXISTS on_referral_created ON council_member_referrals;
CREATE TRIGGER on_referral_created
  AFTER INSERT ON council_member_referrals
  FOR EACH ROW
  EXECUTE FUNCTION notify_citizen_on_referral();

-- Also notify when referral status changes (acknowledged or resolved)
CREATE OR REPLACE FUNCTION public.notify_citizen_on_referral_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_user_id uuid;
  report_type text;
  notification_title text;
  notification_message text;
BEGIN
  -- Only notify on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine which type of report and get the user_id
  IF NEW.transport_report_id IS NOT NULL THEN
    SELECT user_id INTO report_user_id FROM transport_reports WHERE id = NEW.transport_report_id;
    report_type := 'transporte';
  ELSIF NEW.urban_report_id IS NOT NULL THEN
    SELECT user_id INTO report_user_id FROM urban_reports WHERE id = NEW.urban_report_id;
    report_type := 'urbano';
  ELSIF NEW.service_rating_id IS NOT NULL THEN
    SELECT user_id INTO report_user_id FROM service_ratings WHERE id = NEW.service_rating_id;
    report_type := 'serviço';
  END IF;

  -- Set notification content based on new status
  CASE NEW.status
    WHEN 'sent' THEN
      notification_title := 'Encaminhamento enviado';
      notification_message := 'O encaminhamento do seu relato de ' || report_type || ' foi enviado ao(à) vereador(a) ' || NEW.council_member_name || '.';
    WHEN 'acknowledged' THEN
      notification_title := 'Vereador(a) recebeu seu relato';
      notification_message := 'O(A) vereador(a) ' || NEW.council_member_name || ' confirmou o recebimento do seu relato de ' || report_type || '.';
    WHEN 'resolved' THEN
      notification_title := 'Seu encaminhamento foi resolvido';
      notification_message := 'O(A) vereador(a) ' || NEW.council_member_name || ' marcou seu encaminhamento de ' || report_type || ' como resolvido.';
    ELSE
      RETURN NEW;
  END CASE;

  -- Create notification
  IF report_user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      priority,
      action_url,
      metadata
    ) VALUES (
      report_user_id,
      notification_title,
      notification_message,
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
        'report_type', report_type
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for referral updates
DROP TRIGGER IF EXISTS on_referral_updated ON council_member_referrals;
CREATE TRIGGER on_referral_updated
  AFTER UPDATE ON council_member_referrals
  FOR EACH ROW
  EXECUTE FUNCTION notify_citizen_on_referral_update();