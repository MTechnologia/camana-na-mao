-- OS-06 #4224293: checklist condicional de acessibilidade em relatos de transporte
ALTER TABLE public.transport_reports
  ADD COLUMN IF NOT EXISTS accessibility_details jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.transport_reports.accessibility_details IS
  'OS-06: checklist de acessibilidade em JSON (elevador_funcionando, piso_tatil_presente, espaco_cadeirante, info_sonora_visual_disponivel) coletado quando report_type = acessibilidade.';
