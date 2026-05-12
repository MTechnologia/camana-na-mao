-- HU-10 — Sincronização bidirecional entre `status` do relato e
-- `triage_status` da triagem.
--
-- Antes desta migration os dois campos viviam em silos:
--   - O rodapé "Mudar status" do ReportDetailSheet alterava
--     urban_reports.status / transport_reports.status
--   - A aba Triagem alterava report_triage.triage_status
--   - O kanban /admin/triagem só olhava o segundo
--
-- Resultado: gestor marcava como Resolvido no rodapé, o cartão não saía da
-- coluna "A triar". Esta migration corrige isso com triggers AFTER UPDATE
-- em ambos os lados.
--
-- Mapeamento adotado:
--
--   status (relato)   → triage_status
--   --------------------------------
--   pending           → (mantém — pending pode coexistir com untriaged/triaged)
--   in_progress       → in_progress
--   resolved          → resolved
--   rejected          → closed
--
--   triage_status     → status (relato)
--   --------------------------------
--   untriaged         → (mantém — neutro)
--   triaged           → (mantém — gestão definida, mas relato ainda pending)
--   in_progress       → in_progress
--   resolved          → resolved
--   closed            → resolved (closed é o pós-resolvido)
--
-- Prevenção de loop: `pg_trigger_depth() > 1` retorna sem fazer nada.

-- ===========================================================================
-- 1) Trigger em report_triage: replicar pro relato.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.sync_triage_to_report_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status TEXT;
BEGIN
  -- Evita recursão.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Só age quando triage_status realmente mudou.
  IF TG_OP = 'UPDATE' AND OLD.triage_status IS NOT DISTINCT FROM NEW.triage_status THEN
    RETURN NEW;
  END IF;

  v_new_status := CASE NEW.triage_status
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'resolved' THEN 'resolved'
    WHEN 'closed' THEN 'resolved'
    ELSE NULL
  END;

  IF v_new_status IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.source_table = 'urban_reports' THEN
    UPDATE public.urban_reports
    SET status = v_new_status
    WHERE id = NEW.report_id
      AND status IS DISTINCT FROM v_new_status;
  ELSIF NEW.source_table = 'transport_reports' THEN
    UPDATE public.transport_reports
    SET status = v_new_status
    WHERE id = NEW.report_id
      AND status IS DISTINCT FROM v_new_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_triage_to_report_status ON public.report_triage;
CREATE TRIGGER trg_sync_triage_to_report_status
  AFTER INSERT OR UPDATE OF triage_status ON public.report_triage
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_triage_to_report_status();

-- ===========================================================================
-- 2) Trigger em urban_reports / transport_reports: replicar pra triagem.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.sync_report_status_to_triage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_table TEXT := TG_TABLE_NAME;
  v_new_triage_status TEXT;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Só age quando status realmente mudou.
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  v_new_triage_status := CASE NEW.status
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'resolved' THEN 'resolved'
    WHEN 'rejected' THEN 'closed'
    ELSE NULL
  END;

  IF v_new_triage_status IS NULL THEN
    RETURN NEW;
  END IF;

  -- UPSERT na report_triage. Se ainda não existe, cria a linha com o status
  -- novo (preserva a regra "todo relato pode ter triagem mesmo sem prioridade").
  INSERT INTO public.report_triage (
    source_table, report_id, triage_status
  )
  VALUES (
    v_source_table, NEW.id, v_new_triage_status
  )
  ON CONFLICT (source_table, report_id)
  DO UPDATE SET
    triage_status = EXCLUDED.triage_status
  WHERE public.report_triage.triage_status IS DISTINCT FROM EXCLUDED.triage_status;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_urban_status_to_triage ON public.urban_reports;
CREATE TRIGGER trg_sync_urban_status_to_triage
  AFTER UPDATE OF status ON public.urban_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_report_status_to_triage();

DROP TRIGGER IF EXISTS trg_sync_transport_status_to_triage ON public.transport_reports;
CREATE TRIGGER trg_sync_transport_status_to_triage
  AFTER UPDATE OF status ON public.transport_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_report_status_to_triage();

-- ===========================================================================
-- 3) Backfill (one-shot)
--
-- Para relatos que JÁ ESTÃO com status='resolved'/'in_progress'/'rejected' e
-- que ainda não têm registro em report_triage (ou estão com triage_status
-- defasado), cria/atualiza a linha de triagem.
-- ===========================================================================

-- Urban
INSERT INTO public.report_triage (source_table, report_id, triage_status)
SELECT
  'urban_reports',
  ur.id,
  CASE ur.status
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'resolved' THEN 'resolved'
    WHEN 'rejected' THEN 'closed'
  END
FROM public.urban_reports ur
WHERE ur.status IN ('in_progress', 'resolved', 'rejected')
ON CONFLICT (source_table, report_id)
DO UPDATE SET
  triage_status = EXCLUDED.triage_status
WHERE public.report_triage.triage_status IS DISTINCT FROM EXCLUDED.triage_status;

-- Transport
INSERT INTO public.report_triage (source_table, report_id, triage_status)
SELECT
  'transport_reports',
  tr.id,
  CASE tr.status
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'resolved' THEN 'resolved'
    WHEN 'rejected' THEN 'closed'
  END
FROM public.transport_reports tr
WHERE tr.status IN ('in_progress', 'resolved', 'rejected')
ON CONFLICT (source_table, report_id)
DO UPDATE SET
  triage_status = EXCLUDED.triage_status
WHERE public.report_triage.triage_status IS DISTINCT FROM EXCLUDED.triage_status;
