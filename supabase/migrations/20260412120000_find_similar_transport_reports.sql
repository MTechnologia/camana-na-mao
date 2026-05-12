-- HU-5.4: RPC nomeada para relatos de transporte similares (mesma linha + tipo), usada pelo ai-orchestrator.
-- Replica a lógica anterior em PostgREST (lib.fetchSimilarTransportReportsForSupport).

CREATE OR REPLACE FUNCTION public.find_similar_transport_reports(
  p_report_type text,
  p_line_id text DEFAULT NULL,
  p_line_code text DEFAULT NULL,
  p_exclude_user_id uuid DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  protocol_code text,
  report_type text,
  description text,
  occurrence_date date,
  occurrence_time time without time zone,
  location text,
  severity text,
  direction text,
  created_at timestamptz,
  line_code text,
  line_name text
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_report text := nullif(trim(p_report_type), '');
  v_line_id text := nullif(trim(coalesce(p_line_id, '')), '');
  v_line_code text := nullif(trim(coalesce(p_line_code, '')), '');
  v_lim int := least(greatest(coalesce(p_limit, 10), 1), 50);
  v_uuid uuid;
  v_ids uuid[];
BEGIN
  IF v_report IS NULL THEN
    RETURN;
  END IF;

  IF v_line_id IS NOT NULL AND v_line_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_uuid := v_line_id::uuid;
    RETURN QUERY
    SELECT
      tr.id,
      tr.protocol_code,
      tr.report_type::text,
      tr.description,
      tr.occurrence_date,
      tr.occurrence_time,
      tr.location,
      tr.severity::text,
      tr.direction,
      tr.created_at,
      (coalesce(tl.line_code, tr.line_code_custom))::text,
      tl.line_name::text
    FROM public.transport_reports tr
    LEFT JOIN public.transport_lines tl ON tl.id = tr.line_id
    WHERE tr.report_type = v_report
      AND tr.line_id = v_uuid
      AND (p_exclude_user_id IS NULL OR tr.user_id <> p_exclude_user_id)
    ORDER BY tr.created_at DESC
    LIMIT v_lim;
    RETURN;
  END IF;

  IF v_line_code IS NOT NULL THEN
    SELECT coalesce(
      (
        SELECT array_agg(s.id)
        FROM (
          SELECT tl.id
          FROM public.transport_lines tl
          WHERE tl.line_code ILIKE v_line_code
          LIMIT 25
        ) s
      ),
      '{}'::uuid[]
    )
    INTO v_ids;

    IF v_ids IS NOT NULL AND coalesce(array_length(v_ids, 1), 0) > 0 THEN
      RETURN QUERY
      SELECT
        tr.id,
        tr.protocol_code,
        tr.report_type::text,
        tr.description,
        tr.occurrence_date,
        tr.occurrence_time,
        tr.location,
        tr.severity::text,
        tr.direction,
        tr.created_at,
        (coalesce(tl.line_code, tr.line_code_custom))::text,
        tl.line_name::text
      FROM public.transport_reports tr
      LEFT JOIN public.transport_lines tl ON tl.id = tr.line_id
      WHERE tr.report_type = v_report
        AND tr.line_id = ANY (v_ids)
        AND (p_exclude_user_id IS NULL OR tr.user_id <> p_exclude_user_id)
      ORDER BY tr.created_at DESC
      LIMIT v_lim;
    ELSE
      RETURN QUERY
      SELECT
        tr.id,
        tr.protocol_code,
        tr.report_type::text,
        tr.description,
        tr.occurrence_date,
        tr.occurrence_time,
        tr.location,
        tr.severity::text,
        tr.direction,
        tr.created_at,
        (coalesce(tl.line_code, tr.line_code_custom))::text,
        tl.line_name::text
      FROM public.transport_reports tr
      LEFT JOIN public.transport_lines tl ON tl.id = tr.line_id
      WHERE tr.report_type = v_report
        AND tr.line_code_custom = v_line_code
        AND (p_exclude_user_id IS NULL OR tr.user_id <> p_exclude_user_id)
      ORDER BY tr.created_at DESC
      LIMIT v_lim;
    END IF;
    RETURN;
  END IF;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.find_similar_transport_reports(text, text, text, uuid, int) IS
  'HU-5.4: relatos recentes na mesma linha (UUID ou código) e mesmo report_type, opcionalmente excluindo um usuário.';

REVOKE ALL ON FUNCTION public.find_similar_transport_reports(text, text, text, uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_similar_transport_reports(text, text, text, uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_similar_transport_reports(text, text, text, uuid, int) TO service_role;
