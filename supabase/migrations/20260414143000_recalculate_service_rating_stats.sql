-- OS-06 / Task 5619219
-- Recálculo automático da média do serviço após avaliação publicada.

CREATE OR REPLACE FUNCTION public.recalculate_service_rating_stats(p_service_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric;
  v_count integer;
  has_rating_count boolean;
  has_total_ratings boolean;
BEGIN
  IF p_service_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(AVG(sr.rating_stars)::numeric, 0),
    COUNT(*)::integer
  INTO v_avg, v_count
  FROM public.service_ratings sr
  WHERE sr.service_id = p_service_id
    AND sr.publication_status = 'published';

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'public_services'
      AND column_name = 'rating_count'
  ) INTO has_rating_count;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'public_services'
      AND column_name = 'total_ratings'
  ) INTO has_total_ratings;

  IF has_rating_count THEN
    UPDATE public.public_services
    SET average_rating = v_avg,
        rating_count = v_count
    WHERE id = p_service_id;
  ELSIF has_total_ratings THEN
    UPDATE public.public_services
    SET average_rating = v_avg,
        total_ratings = v_count
    WHERE id = p_service_id;
  ELSE
    UPDATE public.public_services
    SET average_rating = v_avg
    WHERE id = p_service_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.recalculate_service_rating_stats(uuid) IS
  'Recalcula average_rating e contagem de avaliações publicadas para um serviço.';

CREATE OR REPLACE FUNCTION public.trg_recalculate_service_rating_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.publication_status = 'published' THEN
      PERFORM public.recalculate_service_rating_stats(NEW.service_id);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.service_id IS DISTINCT FROM OLD.service_id THEN
      IF OLD.publication_status = 'published' THEN
        PERFORM public.recalculate_service_rating_stats(OLD.service_id);
      END IF;
      IF NEW.publication_status = 'published' THEN
        PERFORM public.recalculate_service_rating_stats(NEW.service_id);
      END IF;
      RETURN NEW;
    END IF;

    IF NEW.publication_status = 'published'
       OR OLD.publication_status = 'published' THEN
      PERFORM public.recalculate_service_rating_stats(NEW.service_id);
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.publication_status = 'published' THEN
      PERFORM public.recalculate_service_rating_stats(OLD.service_id);
    END IF;
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_service_rating_trigger ON public.service_ratings;
DROP TRIGGER IF EXISTS update_service_rating_trigger_delete ON public.service_ratings;
DROP TRIGGER IF EXISTS tr_service_ratings_recalculate_stats ON public.service_ratings;

CREATE TRIGGER tr_service_ratings_recalculate_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.service_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalculate_service_rating_stats();
