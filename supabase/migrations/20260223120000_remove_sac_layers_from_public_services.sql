-- Remove da tabela public_services todos os registros cuja source_layer
-- começa com 'sac_' (camadas SP156/SAC do GeoSampa que foram retiradas do sync).
-- Esses pontos não são equipamentos de interesse para o mapa de serviços próximos.
DELETE FROM public_services
WHERE source_layer LIKE 'sac_%';
