-- Quem vê o kanban (`triage.view_kanban`) precisa persistir arraste de coluna
-- (upsert em report_triage). Antes só `triage.manage` podia INSERT/UPDATE,
-- gerando 403 para assessores.

DROP POLICY IF EXISTS "Triage manage can insert" ON public.report_triage;
CREATE POLICY "Triage manage can insert"
  ON public.report_triage
  FOR INSERT
  WITH CHECK (
    public.has_permission(auth.uid(), 'triage.manage')
    OR public.has_permission(auth.uid(), 'triage.view_kanban')
  );

DROP POLICY IF EXISTS "Triage manage can update" ON public.report_triage;
CREATE POLICY "Triage manage can update"
  ON public.report_triage
  FOR UPDATE
  USING (
    public.has_permission(auth.uid(), 'triage.manage')
    OR public.has_permission(auth.uid(), 'triage.view_kanban')
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'triage.manage')
    OR public.has_permission(auth.uid(), 'triage.view_kanban')
  );

COMMENT ON POLICY "Triage manage can insert" ON public.report_triage IS
  'HU-10.3: gestores definem triagem completa; quem tem view_kanban pode registrar movimentação no board.';

COMMENT ON POLICY "Triage manage can update" ON public.report_triage IS
  'HU-10.3: idem insert — arraste no kanban e upserts operacionais.';
