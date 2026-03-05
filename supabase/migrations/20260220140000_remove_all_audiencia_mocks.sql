-- Remove todas as audiências de teste (mocks) usadas para evidência dos lembretes.
DELETE FROM public.audiencias
WHERE splegis_chave LIKE 'TESTE-MOCK%';
