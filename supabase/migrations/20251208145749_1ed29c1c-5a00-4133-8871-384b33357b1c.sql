-- Add N8N processing columns to urban_reports
ALTER TABLE public.urban_reports
ADD COLUMN IF NOT EXISTS n8n_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS n8n_processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS n8n_priority TEXT,
ADD COLUMN IF NOT EXISTS n8n_validated_category TEXT,
ADD COLUMN IF NOT EXISTS n8n_tags TEXT[],
ADD COLUMN IF NOT EXISTS n8n_enriched_data JSONB,
ADD COLUMN IF NOT EXISTS n8n_workflow_id TEXT;

-- Add N8N processing columns to transport_reports
ALTER TABLE public.transport_reports
ADD COLUMN IF NOT EXISTS n8n_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS n8n_processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS n8n_priority TEXT,
ADD COLUMN IF NOT EXISTS n8n_validated_category TEXT,
ADD COLUMN IF NOT EXISTS n8n_tags TEXT[],
ADD COLUMN IF NOT EXISTS n8n_enriched_data JSONB,
ADD COLUMN IF NOT EXISTS n8n_workflow_id TEXT;

-- Create N8N integration logs table
CREATE TABLE IF NOT EXISTS public.n8n_integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB,
  response JSONB,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on n8n_integration_logs
ALTER TABLE public.n8n_integration_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for n8n_integration_logs (admin only)
CREATE POLICY "Admins can view all N8N logs"
ON public.n8n_integration_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert N8N logs"
ON public.n8n_integration_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also allow service role to insert logs (for edge functions)
CREATE POLICY "Service role can insert N8N logs"
ON public.n8n_integration_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_n8n_logs_entity ON public.n8n_integration_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_n8n_logs_status ON public.n8n_integration_logs(status);
CREATE INDEX IF NOT EXISTS idx_n8n_logs_created ON public.n8n_integration_logs(created_at DESC);