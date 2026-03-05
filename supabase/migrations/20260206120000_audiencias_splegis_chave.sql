-- Chave externa da API SPLEGIS para upsert sem duplicar audiências
ALTER TABLE public.audiencias
  ADD COLUMN IF NOT EXISTS splegis_chave TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_audiencias_splegis_chave
  ON public.audiencias(splegis_chave)
  WHERE splegis_chave IS NOT NULL;

COMMENT ON COLUMN public.audiencias.splegis_chave IS 'Chave única da audiência no Web Service SPLEGIS (ws2.asmx) para sincronização';
