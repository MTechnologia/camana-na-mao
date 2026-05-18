-- NREF012: estimativa de saída para visitas já encerradas sem departed_at (histórico).

UPDATE public.service_visits sv
SET departed_at = COALESCE(
  (
    SELECT sr.created_at
    FROM public.service_ratings sr
    WHERE sr.visit_id = sv.id
    ORDER BY sr.created_at ASC
    LIMIT 1
  ),
  sv.updated_at,
  sv.created_at + interval '10 minutes'
)
WHERE sv.departed_at IS NULL
  AND sv.status IN ('completed', 'skipped', 'expired');
