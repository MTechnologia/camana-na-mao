-- Comissão temática responsável na triagem (em vez de usuário staff em assignee_id).

ALTER TABLE public.report_triage
  ADD COLUMN IF NOT EXISTS responsible_commission_id UUID
  REFERENCES public.legislative_commissions(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.report_triage.responsible_commission_id IS
  'Comissão temática indicada na triagem como responsável pelo relato.';

CREATE INDEX IF NOT EXISTS idx_report_triage_responsible_commission
  ON public.report_triage(responsible_commission_id);
