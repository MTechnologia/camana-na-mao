-- Constraint UNIQUE em splegis_chave para permitir upsert (ON CONFLICT).
-- Vários NULLs são permitidos; valores não nulos devem ser únicos.
DROP INDEX IF EXISTS public.idx_audiencias_splegis_chave;

ALTER TABLE public.audiencias
  DROP CONSTRAINT IF EXISTS audiencias_splegis_chave_key;

-- Remove duplicatas (mantém a linha com id menor por splegis_chave)
DELETE FROM public.audiencias a
USING public.audiencias b
WHERE a.splegis_chave IS NOT NULL
  AND b.splegis_chave IS NOT NULL
  AND a.splegis_chave = b.splegis_chave
  AND a.id > b.id;

ALTER TABLE public.audiencias
  ADD CONSTRAINT audiencias_splegis_chave_key UNIQUE (splegis_chave);
