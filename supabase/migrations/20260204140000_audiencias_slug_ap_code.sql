-- Slug e código AP da CMSP para integração Ninja Forms (inscrição oficial)
ALTER TABLE public.audiencias
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS ap_code TEXT;

COMMENT ON COLUMN public.audiencias.slug IS 'Slug da audiência na URL do site da CMSP (audienciaspublicas/audiencia/{slug}/)';
COMMENT ON COLUMN public.audiencias.ap_code IS 'Código da audiência no formulário Ninja Forms (ex: FIN02-26-02-2026)';
