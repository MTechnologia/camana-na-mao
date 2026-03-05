-- Nome da comissão (ex.: Comissão de Finanças e Orçamento) para exibição no padrão "Audiência: Comissão de..."
ALTER TABLE public.audiencias
  ADD COLUMN IF NOT EXISTS comissao TEXT;

COMMENT ON COLUMN public.audiencias.comissao IS 'Nome da comissão responsável pela audiência (ex.: Comissão de Finanças e Orçamento), para exibir como título no app';
