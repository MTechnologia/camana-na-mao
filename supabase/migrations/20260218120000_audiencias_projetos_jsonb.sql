-- Lista de projetos de lei vinculados à audiência (PL + autores), no estilo do site oficial
ALTER TABLE public.audiencias
  ADD COLUMN IF NOT EXISTS projetos JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.audiencias.projetos IS 'Array de { referencia, autores, ementa? } para exibir todos os PLs da audiência (ex.: 28 PLs no site oficial).';
