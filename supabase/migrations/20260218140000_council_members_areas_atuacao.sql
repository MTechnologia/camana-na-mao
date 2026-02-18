-- Área de atuação dos vereadores (comissões/cargos) a partir da API SPLEGIS VereadoresCMSP
ALTER TABLE public.council_members_cache
  ADD COLUMN IF NOT EXISTS areas_de_atuacao JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.council_members_cache.areas_de_atuacao IS 'Comissões e cargos do vereador (ex.: Comissão de Administração Pública), fonte: ws2.asmx/VereadoresCMSP';
