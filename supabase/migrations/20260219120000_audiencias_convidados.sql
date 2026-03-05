-- Lista de convidados da audiência (ex.: "– Sr. Nome - Cargo;"). Exibida na tela de detalhe, padrão do site oficial.
ALTER TABLE public.audiencias
  ADD COLUMN IF NOT EXISTS convidados TEXT;

COMMENT ON COLUMN public.audiencias.convidados IS 'Texto da seção Convidados (ex.: – Sr. Nome - Cargo;). Extraído do Colabore da API SPLEGIS. Exibido em lista na tela de detalhe.';
