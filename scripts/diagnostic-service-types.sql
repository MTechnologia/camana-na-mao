-- Diagnóstico: ver quantos serviços por tipo e quais "other" parecem teatro/cinema/museu
-- Execute no SQL Editor do Supabase e confira o resultado.

-- 1) Contagem por service_type
SELECT service_type, COUNT(*) AS total
FROM public.public_services
GROUP BY service_type
ORDER BY total DESC;

-- 2) Registros ainda "other" cujo nome sugere teatro/cinema (não reclassificados?)
SELECT id, name, address, district
FROM public.public_services
WHERE service_type = 'other'
  AND (
    name ILIKE '%teatro%'
    OR name ILIKE '%cinema%'
    OR name ILIKE '%cinemateca%'
    OR name ILIKE '%pinacoteca%'
    OR name ILIKE '%museu%'
    OR name ILIKE '%galeria%'
    OR name ILIKE '%memorial%'
  )
ORDER BY name;

-- 3) Quantos já são theater ou museum (após reclassify)
SELECT service_type, COUNT(*) AS total
FROM public.public_services
WHERE service_type IN ('theater', 'museum')
GROUP BY service_type;
