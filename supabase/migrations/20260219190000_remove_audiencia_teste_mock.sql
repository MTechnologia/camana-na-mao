-- Remove a audiência de teste (mock) usada para validação dos crons de lembrete.
DELETE FROM public.audiencias
WHERE splegis_chave = 'TESTE-MOCK-16H05';
