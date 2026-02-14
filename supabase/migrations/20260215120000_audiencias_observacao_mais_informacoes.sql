-- Observação (ex.: prazo de inscrição virtual) e Mais informações (ex.: email da comissão) no padrão do site oficial
ALTER TABLE public.audiencias
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS mais_informacoes TEXT;

COMMENT ON COLUMN public.audiencias.observacao IS 'Texto de observação (ex.: prazo para inscrição virtual). Exibido abaixo dos convidados.';
COMMENT ON COLUMN public.audiencias.mais_informacoes IS 'Texto "Mais informações" (ex.: email da comissão). Exibido apenas para audiências futuras.';
