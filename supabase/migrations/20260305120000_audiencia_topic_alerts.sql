-- Preferências de aviso por tema: "avise quando tiver audiências sobre X"
-- Usado pelo chat quando o cidadão pede para ser avisado sobre audiências de um tema (ex.: Esportes).

CREATE TABLE IF NOT EXISTS public.audiencia_topic_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tema TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tema)
);

CREATE INDEX IF NOT EXISTS idx_audiencia_topic_alerts_user_id ON public.audiencia_topic_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_audiencia_topic_alerts_tema ON public.audiencia_topic_alerts(tema);

ALTER TABLE public.audiencia_topic_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own topic alerts"
  ON public.audiencia_topic_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own topic alerts"
  ON public.audiencia_topic_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own topic alerts"
  ON public.audiencia_topic_alerts FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.audiencia_topic_alerts IS 'Temas para os quais o usuário quer receber aviso quando houver novas audiências (ex.: Esportes, Saúde). Chamar process_audiencia_topic_alerts() via cron (ex.: diário) para enviar notificações.';

-- Processa alertas por tema: para cada (user_id, tema) com audiências agendadas no período, insere notificação (máx. 1 por usuário/tema a cada 24h).
CREATE OR REPLACE FUNCTION public.process_audiencia_topic_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  r RECORD;
  v_audiencias TEXT;
  v_titulos TEXT[];
  v_count INT;
  v_since TIMESTAMPTZ := now() - interval '24 hours';
BEGIN
  FOR r IN
    SELECT ata.user_id, ata.tema
    FROM audiencia_topic_alerts ata
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = ata.user_id
        AND n.type = 'audiencia_topic_alert'
        AND n.metadata->>'tema' = ata.tema
        AND n.created_at > v_since
    )
  LOOP
    SELECT array_agg(titulo ORDER BY data, hora NULLS FIRST), count(*)::int
    INTO v_titulos, v_count
    FROM (
      SELECT a.titulo, a.data, a.hora
      FROM audiencias a
      WHERE (a.tema ILIKE '%' || r.tema || '%' OR a.titulo ILIKE '%' || r.tema || '%')
        AND a.data >= current_date
        AND a.status IN ('agendada', 'scheduled')
      ORDER BY a.data, a.hora NULLS FIRST
      LIMIT 5
    ) sub;
    IF v_count > 0 AND v_titulos IS NOT NULL AND array_length(v_titulos, 1) > 0 THEN
      v_audiencias := array_to_string(v_titulos, '; ');
      INSERT INTO notifications (user_id, title, message, type, action_url, priority, metadata)
      VALUES (
        r.user_id,
        'Audiências sobre ' || r.tema,
        'Há ' || v_count || ' audiência(s) agendada(s) sobre ' || r.tema || '. ' || left(v_audiencias, 200) || (CASE WHEN length(v_audiencias) > 200 THEN '...' ELSE '' END) || ' Acesse Audiências no app.',
        'audiencia_topic_alert',
        '/audiencias',
        'normal',
        jsonb_build_object('tema', r.tema)
      );
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.process_audiencia_topic_alerts IS 'Cron: notifica usuários que têm alerta por tema quando existem audiências agendadas para esse tema. Executar diariamente (ex.: pg_cron ou Supabase cron).';
