-- OS-06: toggle de privacidade para detecção automática de visitas a equipamentos públicos
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS visit_detection_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.user_preferences.visit_detection_enabled IS
  'Quando false, web e Edge não criam novas service_visits nem atualizam monitoramento de visitas (localização).';
