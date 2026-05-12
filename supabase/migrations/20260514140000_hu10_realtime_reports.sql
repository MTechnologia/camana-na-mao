-- HU-10 — Adiciona urban_reports e transport_reports à publication
-- supabase_realtime para que mudanças (incluindo status atualizado pelo
-- rodapé legado do ReportDetailSheet) propaguem em tempo real para o
-- kanban /admin/triagem e demais views que escutam essas tabelas.
--
-- Sem isso, o `useTriageKanban` (que tem useRealtimeRefresh nessas 2
-- tabelas) só recebia eventos pela report_triage. Quando o trigger de
-- sincronização do banco propagava o status, o realtime não acionava
-- porque ele observa a tabela de origem, não a destino.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'urban_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.urban_reports;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'transport_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_reports;
  END IF;
END
$$;
