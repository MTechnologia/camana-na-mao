-- Executar DEPOIS de aplicar a migration que adiciona 'street_market' ao enum service_type.
-- Remove registros que são apenas nomes de bairros (tipo "other") e reclassifica feiras como street_market.

-- 1) Remover bairros cadastrados como serviço (tipo "other", nome = nome do bairro)
DELETE FROM public.public_services
WHERE service_type = 'other'
  AND (
    TRIM(LOWER(name)) IN (
      'paraisópolis', 'paraisopolis',
      'real parque',
      'vila morse',
      'caxingui'
    )
  );

-- 2) Reclassificar feiras/feirões como street_market (mantém "Feirão da Economia Real Parque" etc.)
UPDATE public.public_services
SET service_type = 'street_market', updated_at = now()
WHERE service_type = 'other'
  AND (
    name ILIKE '%feirão%'
    OR name ILIKE '%feirao%'
    OR name ILIKE '%feira %'
    OR name ILIKE 'feira %'
  );

-- 3) Remover feiras que apontam para local inexistente (verificado no Maps)
DELETE FROM public.public_services
WHERE TRIM(LOWER(name)) = 'feira linda';
