-- Remove apenas registros que vieram do sync GeoSampa.
-- Mantém: registros manuais (source_layer NULL), CEUs do site SME (ceu_sme) e Escola Aberta API (escola_aberta).
DELETE FROM public.public_services
WHERE source_layer IS NOT NULL
  AND source_layer NOT IN ('ceu_sme', 'escola_aberta');
