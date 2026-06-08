-- Busca de serviços (chatbot "Qual o nome do serviço?" e busca por nome/bairro/endereço):
-- a query REST usa `name/district/address ILIKE '%termo%'` (curinga à esquerda), que NÃO
-- usa B-tree nem o tsvector existente. Em public_services (~4,3M linhas) isso virava seq scan
-- e estourava o statement_timeout (erro 500 / 57014), devolvendo lista vazia mesmo com o
-- serviço cadastrado (ex.: "CEU Rosa" não achava "CEU Rosa da China").
--
-- Solução: índices GIN trigram (pg_trgm) PARCIAIS, restritos aos service_type pesquisáveis
-- (~634k linhas, ~14% da tabela). Com os três índices, o planner faz BitmapOr e a busca cai
-- de timeout para ~14 ms. Os três são obrigatórios: um OR em 3 colunas só usa índice se TODAS
-- as colunas estiverem indexadas; faltando uma, volta ao seq scan.
SET statement_timeout = 0;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_public_services_name_trgm
  ON public.public_services USING gin (name gin_trgm_ops)
  WHERE service_type IN (
    'ubs','hospital','school','ceu','library','daycare','park','sports_center',
    'community_center','social_assistance','police_station','fire_station',
    'subprefeitura','market','city_market','street_market','theater','museum','cemetery'
  );

CREATE INDEX IF NOT EXISTS idx_public_services_district_trgm
  ON public.public_services USING gin (district gin_trgm_ops)
  WHERE service_type IN (
    'ubs','hospital','school','ceu','library','daycare','park','sports_center',
    'community_center','social_assistance','police_station','fire_station',
    'subprefeitura','market','city_market','street_market','theater','museum','cemetery'
  );

CREATE INDEX IF NOT EXISTS idx_public_services_address_trgm
  ON public.public_services USING gin (address gin_trgm_ops)
  WHERE service_type IN (
    'ubs','hospital','school','ceu','library','daycare','park','sports_center',
    'community_center','social_assistance','police_station','fire_station',
    'subprefeitura','market','city_market','street_market','theater','museum','cemetery'
  );

-- Refresh de estatísticas para o planner escolher o BitmapOr de imediato.
ANALYZE public.public_services;

RESET statement_timeout;
