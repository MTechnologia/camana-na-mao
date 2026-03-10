-- Permite inscrição presencial em audiências (além de videoconferência e escrito).
-- Usado no formulário do chatbot e na página de participação.
ALTER TABLE public.audiencia_participacoes
  DROP CONSTRAINT IF EXISTS audiencia_participacoes_tipo_check;

ALTER TABLE public.audiencia_participacoes
  ADD CONSTRAINT audiencia_participacoes_tipo_check
  CHECK (tipo IN ('videoconferencia', 'escrito', 'presencial'));

COMMENT ON COLUMN public.audiencia_participacoes.tipo IS 'Forma de participação: videoconferencia, escrito ou presencial';
