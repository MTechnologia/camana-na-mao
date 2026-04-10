-- Helpers de retenção para sinais de visita usados em indicadores de movimentação.
-- Não agenda execução automática; apenas disponibiliza funções para operação controlada.

CREATE OR REPLACE FUNCTION public.purge_old_visit_signal_notifications(
  p_keep_days integer DEFAULT 180
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  IF public.has_any_role(auth.uid(), array['admin','gestor']::public.app_role[]) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Apenas admin/gestor pode executar expurgo de sinais de visita.';
  END IF;

  DELETE FROM public.notifications n
  WHERE n.type = 'visita_servico'
    AND n.action_url ~ '^/avaliar/[0-9a-fA-F-]{36}$'
    AND n.created_at < now() - (LEAST(GREATEST(p_keep_days, 30), 3650) || ' days')::interval;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.purge_old_visit_signal_notifications(integer) IS
  'Expurga notificações antigas de visita_servico para retenção LGPD. Executar manualmente/por job interno.';

GRANT EXECUTE ON FUNCTION public.purge_old_visit_signal_notifications(integer) TO authenticated;

