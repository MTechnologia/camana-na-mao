-- Tabela para rastrear tempo de permanencia do usuario em cada servico (deteccao em background).
-- Usada pela edge function detect-service-visit ao receber lat/lng do app mobile.
CREATE TABLE IF NOT EXISTS public.visit_detection_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.public_services(id) ON DELETE CASCADE,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, service_id)
);

CREATE INDEX idx_visit_detection_state_updated ON public.visit_detection_state(updated_at);

ALTER TABLE public.visit_detection_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for visit_detection_state"
  ON public.visit_detection_state
  FOR ALL
  USING (false)
  WITH CHECK (false);
