-- OS-05: log auditável de decisões de severidade / nível de risco atribuídas no fluxo do assistente (ai-orchestrator).
-- Uma linha por decisão registrada na criação do relato (urbano ou transporte).

CREATE TABLE IF NOT EXISTS public.report_severity_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  urban_report_id uuid REFERENCES public.urban_reports (id) ON DELETE CASCADE,
  transport_report_id uuid REFERENCES public.transport_reports (id) ON DELETE CASCADE,
  /** Ex.: risk_level (urbano), severity (transporte) */
  metric text NOT NULL,
  previous_value text,
  new_value text NOT NULL,
  /** Texto legível: regra aplicada, auto-inferência, etc. */
  justification text NOT NULL,
  /** Trecho da descrição ou termo que sustenta a decisão (acurácia / revisão humana) */
  source_snippet text,
  confidence numeric,
  engine text NOT NULL DEFAULT 'ai-orchestrator',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_severity_audit_one_parent CHECK (
    (urban_report_id IS NOT NULL AND transport_report_id IS NULL)
    OR (urban_report_id IS NULL AND transport_report_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS report_severity_audit_urban_idx ON public.report_severity_audit_log (urban_report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS report_severity_audit_transport_idx ON public.report_severity_audit_log (transport_report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS report_severity_audit_created_idx ON public.report_severity_audit_log (created_at DESC);

COMMENT ON TABLE public.report_severity_audit_log IS
  'Auditoria de severidade/risco definidos na criação do relato pelo orquestrador de IA. Moderação: SELECT por perfil staff.';

ALTER TABLE public.report_severity_audit_log ENABLE ROW LEVEL SECURITY;

-- Gestores e admins veem todo o histórico (revisão humana OS-05)
CREATE POLICY "Staff can view severity audit log"
  ON public.report_severity_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'gestor'::public.app_role)
    )
  );

-- Autor do relato registra log logo após criar o próprio relato (JWT do cidadão no Edge Function)
CREATE POLICY "Report owners can insert severity audit log"
  ON public.report_severity_audit_log
  FOR INSERT
  WITH CHECK (
    (
      urban_report_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.urban_reports r WHERE r.id = urban_report_id AND r.user_id = auth.uid()
      )
    )
    OR (
      transport_report_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.transport_reports t WHERE t.id = transport_report_id AND t.user_id = auth.uid()
      )
    )
  );

GRANT SELECT ON public.report_severity_audit_log TO authenticated;
GRANT INSERT ON public.report_severity_audit_log TO authenticated;
