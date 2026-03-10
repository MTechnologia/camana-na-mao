-- Reclassifica serviços com tipo "other" conforme docs/tipos-de-servico-sugeridos.md
--
-- Se der erro "invalid input value for enum service_type", execute ANTES no SQL Editor:
--   scripts/01-apply-enum-service-types.sql
--
-- Ordem dos UPDATEs evita sobreposição: padrões mais específicos primeiro.

-- 1) Assistência Social: CRAS, CREAS, Centros de Referência de Assistência
UPDATE public.public_services
SET service_type = 'social_assistance', updated_at = now()
WHERE service_type = 'other'
  AND (
    name ILIKE '%CRAS%'
    OR name ILIKE '%CREAS%'
    OR name ILIKE '%centro de referência de assistência%'
    OR name ILIKE '%assistência social%'
    OR name ILIKE '%acolhimento%'
  );

-- 2) Centro Comunitário: centros de convivência, casas de cultura
UPDATE public.public_services
SET service_type = 'community_center', updated_at = now()
WHERE service_type = 'other'
  AND (
    name ILIKE '%centro comunitário%'
    OR name ILIKE '%centro comunitario%'
    OR name ILIKE '%casa de cultura%'
    OR name ILIKE '%centro de convivência%'
    OR name ILIKE '%centro de convivencia%'
  );

-- 3) Creche / CMEI
UPDATE public.public_services
SET service_type = 'daycare', updated_at = now()
WHERE service_type = 'other'
  AND (
    name ILIKE '%creche%'
    OR name ILIKE '%CMEI%'
    OR name ILIKE '%CEI %'
    OR name ILIKE 'CEI %'
  );

-- 4) Parque / Área verde (nome do equipamento contém Parque ou Praça)
UPDATE public.public_services
SET service_type = 'park', updated_at = now()
WHERE service_type = 'other'
  AND (
    name ILIKE '%parque%'
    OR name ILIKE '% praça %'
    OR name ILIKE 'praça %'
    OR name ILIKE '% praca %'
    OR name ILIKE 'praca %'
  );

-- 5) Delegacia / Polícia
UPDATE public.public_services
SET service_type = 'police_station', updated_at = now()
WHERE service_type = 'other'
  AND (
    name ILIKE '%delegacia%'
    OR name ILIKE '%polícia%'
    OR name ILIKE '%policia%'
    OR name ILIKE '%guarda civil%'
    OR name ILIKE '%base comunitária%'
  );

-- 6) Transporte: terminais, estações
UPDATE public.public_services
SET service_type = 'transit_station', updated_at = now()
WHERE service_type = 'other'
  AND (
    name ILIKE '%terminal %'
    OR name ILIKE 'terminal %'
    OR name ILIKE '%estação %'
    OR name ILIKE '%estacao %'
    OR name ILIKE '%estação de %'
  );

-- 7) Mercado / Sacolão (não feira livre – feiras já são street_market)
UPDATE public.public_services
SET service_type = 'market', updated_at = now()
WHERE service_type = 'other'
  AND (
    name ILIKE '%mercado %'
    OR name ILIKE 'mercado %'
    OR name ILIKE '%sacolão%'
    OR name ILIKE '%sacolao%'
  );

-- 8) Teatro / Cinema (inclui cinemateca, sala de cinema, casa de espetáculos)
UPDATE public.public_services
SET service_type = 'theater', updated_at = now()
WHERE service_type = 'other'
  AND (
    name ILIKE '%teatro%'
    OR name ILIKE '%cinema%'
    OR name ILIKE '%cinemateca%'
    OR name ILIKE '%sala cinematográfica%'
    OR name ILIKE '%casa de espetáculo%'
    OR name ILIKE '%casa de espetaculo%'
  );

-- 9) Museu (inclui pinacoteca, galeria, memorial, centros culturais com acervo)
UPDATE public.public_services
SET service_type = 'museum', updated_at = now()
WHERE service_type = 'other'
  AND (
    name ILIKE '%museu%'
    OR name ILIKE '%pinacoteca%'
    OR name ILIKE '%galeria%'
    OR name ILIKE '%memorial%'
  );

-- 10) Cemitério
UPDATE public.public_services
SET service_type = 'cemetery', updated_at = now()
WHERE service_type = 'other'
  AND (
    name ILIKE '%cemitério%'
    OR name ILIKE '%cemiterio%'
  );
