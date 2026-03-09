-- Referência ao projeto (ex.: PL 1461/2025) e autores (ex.: Executivo - RICARDO NUNES) para exibir na tela de detalhe
ALTER TABLE public.audiencias
  ADD COLUMN IF NOT EXISTS projeto_referencia TEXT,
  ADD COLUMN IF NOT EXISTS projeto_autores TEXT;

COMMENT ON COLUMN public.audiencias.projeto_referencia IS 'Referência ao projeto de lei (ex.: PL 1461/2025). Preenchido quando a audiência está vinculada a um PL.';
COMMENT ON COLUMN public.audiencias.projeto_autores IS 'Autoria do projeto (ex.: Executivo - RICARDO NUNES). Exibido na tela de detalhe.';
