-- Ocupação de EQUIPAMENTOS (serviços) usando "último ping" de avaliação por USUÁRIO.
-- Necessário para subdividir as métricas por equipamento no admin.
--
-- Fonte do ping:
-- notifications.type = 'visita_servico'
-- notifications.action_url = '/avaliar/{service_visits.id}'
-- -> service_visits.service_id mapeia o equipamento (public_services).

CREATE OR REPLACE FUNCTION public.get_equipment_occupancy_top(
  p_days integer DEFAULT 14,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  service_id uuid,
  service_name text,
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
      sv.service_id,
      n.user_id,
      MAX(n.created_at) AS last_ping_at
    FROM public.notifications n
    JOIN public.service_visits sv
      ON sv.id = split_part(n.action_url, '/', 3)::uuid
    WHERE
      public.has_any_role(auth.uid(), array['admin','gestor']::public.app_role[]) = true
      AND n.type = 'visita_servico'
      AND n.action_url ~ '^/avaliar/[0-9a-fA-F-]{36}$'
      AND n.created_at >= now() - (p_days || ' days')::interval
    GROUP BY sv.service_id, n.user_id
  )
  SELECT
    l.service_id,
    ps.name AS service_name,
    COUNT(*)::int AS users_count,
    MAX(l.last_ping_at) AS last_ping_at
  FROM last_per_user l
  JOIN public.public_services ps
    ON ps.id = l.service_id
  GROUP BY l.service_id, ps.name
  ORDER BY users_count DESC, last_ping_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

GRANT EXECUTE ON FUNCTION public.get_equipment_occupancy_top(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_equipment_occupancy_top(integer, integer) TO anon;

CREATE OR REPLACE FUNCTION public.get_equipment_occupancy_heatmap_for_service(
  p_service_id uuid,
  p_days integer DEFAULT 7
)
RETURNS TABLE (
  day_label text,
  hour_label text,
  value integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT generate_series(
      date_trunc('day', now()) - (p_days - 1) * interval '1 day',
      date_trunc('day', now()),
      interval '1 day'
    )::timestamptz AS day_bucket
  ),
  hours AS (
    SELECT generate_series(0, 23) AS hour_bucket
  ),
  last_per_user AS (
    SELECT
      n.user_id,
      MAX(n.created_at) AS last_ping_at
    FROM public.notifications n
    JOIN public.service_visits sv
      ON sv.id = split_part(n.action_url, '/', 3)::uuid
    WHERE
      public.has_any_role(auth.uid(), array['admin','gestor']::public.app_role[]) = true
      AND sv.service_id = p_service_id
      AND n.type = 'visita_servico'
      AND n.action_url ~ '^/avaliar/[0-9a-fA-F-]{36}$'
      AND n.created_at >= now() - (p_days || ' days')::interval
    GROUP BY n.user_id
  ),
  bucketed AS (
    SELECT
      date_trunc('day', last_ping_at) AS day_bucket,
      date_part('hour', last_ping_at)::int AS hour_bucket,
      COUNT(*)::int AS cnt
    FROM last_per_user
    GROUP BY 1,2
  ),
  grid AS (
    SELECT
      d.day_bucket,
      h.hour_bucket
    FROM days d
    CROSS JOIN hours h
  )
  SELECT
    to_char(g.day_bucket, 'YYYY-MM-DD') AS day_label,
    lpad(g.hour_bucket::text, 2, '0') AS hour_label,
    COALESCE(b.cnt, 0)::int AS value
  FROM grid g
  LEFT JOIN bucketed b
    ON b.day_bucket = g.day_bucket
   AND b.hour_bucket = g.hour_bucket
  ORDER BY g.day_bucket, g.hour_bucket;
$$;

GRANT EXECUTE ON FUNCTION public.get_equipment_occupancy_heatmap_for_service(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_equipment_occupancy_heatmap_for_service(uuid, integer) TO anon;

CREATE OR REPLACE FUNCTION public.get_equipment_occupancy_daily_for_service(
  p_service_id uuid,
  p_days integer DEFAULT 14
)
RETURNS TABLE (
  day_label text,
  value integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT generate_series(
      date_trunc('day', now()) - (p_days - 1) * interval '1 day',
      date_trunc('day', now()),
      interval '1 day'
    )::timestamptz AS day_bucket
  ),
  last_per_user AS (
    SELECT
      n.user_id,
      MAX(n.created_at) AS last_ping_at
    FROM public.notifications n
    JOIN public.service_visits sv
      ON sv.id = split_part(n.action_url, '/', 3)::uuid
    WHERE
      public.has_any_role(auth.uid(), array['admin','gestor']::public.app_role[]) = true
      AND sv.service_id = p_service_id
      AND n.type = 'visita_servico'
      AND n.action_url ~ '^/avaliar/[0-9a-fA-F-]{36}$'
      AND n.created_at >= now() - (p_days || ' days')::interval
    GROUP BY n.user_id
  ),
  bucketed AS (
    SELECT
      date_trunc('day', last_ping_at) AS day_bucket,
      COUNT(*)::int AS cnt
    FROM last_per_user
    GROUP BY 1
  )
  SELECT
    to_char(d.day_bucket, 'YYYY-MM-DD') AS day_label,
    COALESCE(b.cnt, 0)::int AS value
  FROM days d
  LEFT JOIN bucketed b
    ON b.day_bucket = d.day_bucket
  ORDER BY d.day_bucket;
$$;

GRANT EXECUTE ON FUNCTION public.get_equipment_occupancy_daily_for_service(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_equipment_occupancy_daily_for_service(uuid, integer) TO anon;

