-- Garante constraint v2 de correction_type (idempotente).
-- Corrige projetos que aplicaram 20260311120000 mas não 20260311160000.

ALTER TABLE public.service_corrections DROP CONSTRAINT IF EXISTS service_corrections_correction_type_check;

UPDATE public.service_corrections
SET correction_type = CASE correction_type
  WHEN 'horario' THEN 'horario_incorreto'
  WHEN 'localizacao' THEN 'localizacao_incorreta'
  WHEN 'servico' THEN 'servico_listado_indisponivel'
  WHEN 'outro' THEN 'informacao_desatualizada'
  ELSE correction_type
END;

UPDATE public.service_corrections
SET correction_type = 'informacao_desatualizada'
WHERE correction_type IS NULL
   OR trim(correction_type) = ''
   OR correction_type NOT IN (
     'horario_incorreto',
     'servico_listado_indisponivel',
     'servico_disponivel_nao_listado',
     'localizacao_incorreta',
     'informacao_desatualizada'
   );

ALTER TABLE public.service_corrections
  ALTER COLUMN correction_type SET DEFAULT 'informacao_desatualizada';

ALTER TABLE public.service_corrections
  ADD CONSTRAINT service_corrections_correction_type_check
  CHECK (
    correction_type IN (
      'horario_incorreto',
      'servico_listado_indisponivel',
      'servico_disponivel_nao_listado',
      'localizacao_incorreta',
      'informacao_desatualizada'
    )
  );
