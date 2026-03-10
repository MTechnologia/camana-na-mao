-- Feedback loop na classificação IA: correções (N8N, admin, usuário) melhoram o modelo
-- Cada correção é armazenada e usada para classificar relatos futuros com descrição similar.

CREATE TABLE IF NOT EXISTS public.report_classification_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('urban', 'transport')),
  report_id UUID NOT NULL,
  original_category TEXT NOT NULL,
  original_subcategory TEXT,
  corrected_category TEXT NOT NULL,
  corrected_subcategory TEXT,
  description_excerpt TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'n8n', 'user')),
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.report_classification_feedback IS 'Correções de categoria/subcategoria para melhorar a classificação IA (feedback loop)';
COMMENT ON COLUMN public.report_classification_feedback.description_excerpt IS 'Trecho da descrição do relato (até 500 chars) para match em classificações futuras';

CREATE INDEX IF NOT EXISTS idx_report_classification_feedback_report_type ON public.report_classification_feedback(report_type);
CREATE INDEX IF NOT EXISTS idx_report_classification_feedback_created_at ON public.report_classification_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_classification_feedback_corrected_category ON public.report_classification_feedback(corrected_category);

ALTER TABLE public.report_classification_feedback ENABLE ROW LEVEL SECURITY;

-- Edge Functions (n8n-callback, ai-orchestrator) usam service_role e ignoram RLS
-- Logado: apenas admins/gestores podem ver e inserir feedback (ao corrigir categoria no painel)
CREATE POLICY "Admins can view classification feedback"
  ON public.report_classification_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'gestor')
    )
  );

CREATE POLICY "Admins can insert classification feedback"
  ON public.report_classification_feedback FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'gestor')
    )
  );
