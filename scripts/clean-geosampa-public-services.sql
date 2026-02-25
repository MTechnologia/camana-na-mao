-- Remove apenas registros que vieram do sync GeoSampa (source_layer preenchido).
-- Registros manuais (source_layer NULL) são mantidos.
DELETE FROM public.public_services
WHERE source_layer IS NOT NULL;
