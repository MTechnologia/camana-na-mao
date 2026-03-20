-- Moderação automática de avaliações: status de publicação antes da visibilidade pública.
-- Valores: published | pending_review | rejected

ALTER TABLE public.service_ratings
  ADD COLUMN IF NOT EXISTS publication_status text NOT NULL DEFAULT 'published'
  CHECK (publication_status IN ('published', 'pending_review', 'rejected'));

COMMENT ON COLUMN public.service_ratings.publication_status IS
  'published = visível publicamente (não anônimo); pending_review = aguardando revisão; rejected = não publicável (conteúdo bloqueado).';

-- Dados existentes: já estavam efetivamente públicos pela política antiga
UPDATE public.service_ratings
SET publication_status = 'published'
WHERE publication_status IS DISTINCT FROM 'published';

ALTER TABLE public.service_ratings
  ALTER COLUMN publication_status SET DEFAULT 'pending_review';

CREATE INDEX IF NOT EXISTS idx_service_ratings_publication
  ON public.service_ratings (publication_status);

CREATE INDEX IF NOT EXISTS idx_service_ratings_service_published
  ON public.service_ratings (service_id)
  WHERE publication_status = 'published';

-- Classificação determinística (mantida alinhada à checagem na Edge Function quando possível)
CREATE OR REPLACE FUNCTION public.compute_service_rating_publication_status(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  t text;
  n text;
  term text;
  blocked_terms text[] := ARRAY[
    'puta', 'puto', 'merda', 'caralho', 'caralha', 'buceta', 'cusao', 'cusão',
    'fdp', 'pqp', 'cacete', 'vtnc'
  ];
BEGIN
  t := trim(COALESCE(p_text, ''));
  IF length(t) < 5 THEN
    RETURN 'rejected';
  END IF;

  -- Links (evita spam / phishing em comentários públicos)
  IF t ~* 'https?://|www\.' THEN
    RETURN 'rejected';
  END IF;

  n := lower(t);
  n := translate(
    n,
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'
  );

  -- Frases de ódio / insulto grave (substring)
  IF n LIKE '%filho da puta%'
     OR n LIKE '%filha da puta%'
     OR n LIKE '%vai tomar no cu%'
     OR n LIKE '%vai se foder%'
     OR n LIKE '%negro de merda%'
     OR n LIKE '%negra de merda%'
  THEN
    RETURN 'rejected';
  END IF;

  -- E-mail
  IF t ~* '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' THEN
    RETURN 'pending_review';
  END IF;

  -- Possível CPF
  IF t ~ '\d{3}\.?\d{3}\.?\d{3}-?\d{2}' THEN
    RETURN 'pending_review';
  END IF;

  -- Telefone BR (11 dígitos com DDD)
  IF t ~ '(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}' AND length(regexp_replace(t, '\D', '', 'g')) >= 10 THEN
    RETURN 'pending_review';
  END IF;

  -- Repetição excessiva do mesmo caractere
  IF t ~ '(.)\1{12,}' THEN
    RETURN 'pending_review';
  END IF;

  -- Muitas exclamações (ruído / spam)
  IF length(t) - length(replace(t, '!', '')) >= 5 THEN
    RETURN 'pending_review';
  END IF;

  -- Texto muito longo (revisão humana)
  IF length(t) > 2000 THEN
    RETURN 'pending_review';
  END IF;

  FOREACH term IN ARRAY blocked_terms
  LOOP
    IF length(term) >= 2 AND n ~ ('[[:<:]]' || term || '[[:>:]]') THEN
      RETURN 'rejected';
    END IF;
  END LOOP;

  RETURN 'published';
END;
$$;

COMMENT ON FUNCTION public.compute_service_rating_publication_status(text) IS
  'Retorna publication_status sugerido para o texto do comentário (regras automáticas).';

REVOKE ALL ON FUNCTION public.compute_service_rating_publication_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_service_rating_publication_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_service_rating_publication_status(text) TO service_role;

CREATE OR REPLACE FUNCTION public.service_ratings_before_write_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_staff boolean;
BEGIN
  is_staff := EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::public.app_role, 'gestor'::public.app_role)
  );

  IF TG_OP = 'INSERT' THEN
    NEW.publication_status := public.compute_service_rating_publication_status(NEW.rating_text);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Cidadão não pode promover sozinho para publicado; staff pode alterar status de moderação
    IF NOT is_staff AND NEW.publication_status IS DISTINCT FROM OLD.publication_status THEN
      NEW.publication_status := OLD.publication_status;
    END IF;
    IF NEW.rating_text IS DISTINCT FROM OLD.rating_text THEN
      NEW.publication_status := public.compute_service_rating_publication_status(NEW.rating_text);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_service_ratings_publication ON public.service_ratings;
CREATE TRIGGER tr_service_ratings_moderation
  BEFORE INSERT OR UPDATE ON public.service_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.service_ratings_before_write_moderation();

-- Média / total só com avaliações publicadas
CREATE OR REPLACE FUNCTION public.update_service_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    sid := OLD.service_id;
  ELSE
    sid := NEW.service_id;
  END IF;

  UPDATE public.public_services ps
  SET
    average_rating = COALESCE(
      (SELECT AVG(sr.rating_stars)::numeric
       FROM public.service_ratings sr
       WHERE sr.service_id = sid
         AND sr.publication_status = 'published'),
      0
    ),
    total_ratings = (
      SELECT COUNT(*)::integer
      FROM public.service_ratings sr
      WHERE sr.service_id = sid
        AND sr.publication_status = 'published'
    )
  WHERE ps.id = sid;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_service_rating_trigger ON public.service_ratings;
CREATE TRIGGER update_service_rating_trigger
  AFTER INSERT OR UPDATE ON public.service_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_service_rating();

DROP TRIGGER IF EXISTS update_service_rating_trigger_delete ON public.service_ratings;
CREATE TRIGGER update_service_rating_trigger_delete
  AFTER DELETE ON public.service_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_service_rating();

-- Visibilidade pública: só publicadas
DROP POLICY IF EXISTS "Anyone can view non-anonymous ratings" ON public.service_ratings;

CREATE POLICY "Anyone can view published non-anonymous ratings"
  ON public.service_ratings
  FOR SELECT
  USING (is_anonymous = false AND publication_status = 'published');

-- Admin e gestor podem alterar status (aprovar fila)
CREATE POLICY "Staff can update ratings for moderation"
  ON public.service_ratings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'gestor'::public.app_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'gestor'::public.app_role)
    )
  );

-- Recálculo em massa de média/total em public_services foi movido para script manual:
-- scripts/sql/recalculate-public-services-rating-aggregates.sql
-- (evita timeout no SQL Editor / migration em bases grandes). Novas alterações em
-- service_ratings continuam atualizadas pelos triggers update_service_rating.
