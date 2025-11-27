-- Criar tabela para respostas de relatos de transporte
CREATE TABLE public.transport_report_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.transport_reports(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL,
  response_text TEXT NOT NULL,
  response_type TEXT NOT NULL DEFAULT 'answer',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar campos de tracking na tabela transport_reports
ALTER TABLE public.transport_reports 
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS first_response_time INTERVAL DEFAULT NULL;

-- Habilitar RLS
ALTER TABLE public.transport_report_responses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage all responses"
ON public.transport_report_responses
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view public responses to their reports"
ON public.transport_report_responses
FOR SELECT
USING (
  is_public = true 
  AND EXISTS (
    SELECT 1 FROM public.transport_reports 
    WHERE id = report_id AND user_id = auth.uid()
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_transport_report_responses_updated_at
BEFORE UPDATE ON public.transport_report_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_report_responses;