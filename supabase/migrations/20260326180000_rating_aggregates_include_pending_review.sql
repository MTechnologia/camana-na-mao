-- Média e total em public_services: incluir avaliações em pending_review além de published.
-- Motivo: a sinalização "média abaixo de 2 estrelas" e os agregados no mapa/lista devem
-- refletir notas já enviadas; comentários em fila de moderação ainda não aparecem na lista
-- pública (RLS), mas as estrelas já são válidas para verificação operacional.

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
         AND sr.publication_status IN ('published', 'pending_review')),
      0
    ),
    total_ratings = (
      SELECT COUNT(*)::integer
      FROM public.service_ratings sr
      WHERE sr.service_id = sid
        AND sr.publication_status IN ('published', 'pending_review')
    )
  WHERE ps.id = sid;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_service_rating() IS
  'Recalcula average_rating e total_ratings em public_services a partir de avaliações published ou pending_review (rejected excluído).';
