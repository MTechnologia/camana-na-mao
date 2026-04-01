-- Resumo público de ocupação por equipamento para tela do munícipe (sem heatmap).
-- Regra: conta usuários únicos cujo último ping no equipamento ocorreu dentro da janela.

CREATE OR REPLACE FUNCTION public.get_equipment_occupancy_summary_for_service(
  p_service_id uuid,
  p_window_minutes integer DEFAULT 120
)
RETURNS TABLE (
  users_count integer,
  last_ping_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH last_per_user AS (
    SELECT
      n.user_id,
      MAX(n.created_at) AS last_ping_at
    FROM public.notifications n
    JOIN public.service_visits sv
      ON sv.id = split_part(n.action_url, '/', 3)::uuid
    WHERE
      sv.service_id = p_service_id
      AND n.type = 'visita_servico'
      AND n.action_url ~ '^/avaliar/[0-9a-fA-F-]{36}$'
    GROUP BY n.user_id
  ),
  current_window AS (
    SELECT
      COUNT(*)::int AS users_count,
      MAX(last_ping_at) AS last_ping_at
    FROM last_per_user
    WHERE last_ping_at >= now() - (LEAST(GREATEST(p_window_minutes, 5), 1440) || ' minutes')::interval
  )
  SELECT
    COALESCE(cw.users_count, 0)::int AS users_count,
    cw.last_ping_at
  FROM current_window cw;
$$;

GRANT EXECUTE ON FUNCTION public.get_equipment_occupancy_summary_for_service(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_equipment_occupancy_summary_for_service(uuid, integer) TO anon;

