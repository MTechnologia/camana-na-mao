-- Estatísticas agregadas das avaliações do usuário autenticado (histórico / UI com paginação)
CREATE OR REPLACE FUNCTION public.get_user_service_ratings_stats()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_avg numeric;
  v_count bigint;
BEGIN
  SELECT
    COALESCE(AVG(sr.rating_stars::numeric), 0),
    COUNT(*)::bigint
  INTO v_avg, v_count
  FROM public.service_ratings sr
  WHERE sr.user_id = auth.uid();

  RETURN json_build_object(
    'avg_stars', ROUND(v_avg::numeric, 2),
    'total_count', v_count
  );
END;
$$;

COMMENT ON FUNCTION public.get_user_service_ratings_stats() IS
  'Retorna média de estrelas e total de avaliações do usuário (auth.uid()) para o histórico em tela.';

REVOKE ALL ON FUNCTION public.get_user_service_ratings_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_service_ratings_stats() TO authenticated;
