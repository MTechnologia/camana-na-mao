-- HU-5.5: status canônicos alinhados entre relatos urbanos e transporte (pending | in_progress | resolved | rejected).

-- === urban_reports ===
UPDATE public.urban_reports
SET status = 'pending'
WHERE status IS NULL OR btrim(status) = '';

UPDATE public.urban_reports
SET status = 'pending'
WHERE lower(btrim(status)) IN ('pendente', 'novo', 'aberto');

UPDATE public.urban_reports
SET status = 'in_progress'
WHERE lower(btrim(status)) IN (
  'em andamento',
  'em_andamento',
  'andamento',
  'em analise',
  'em análise'
);

UPDATE public.urban_reports
SET status = 'resolved'
WHERE lower(btrim(status)) IN (
  'resolvido',
  'fechado',
  'closed',
  'concluido',
  'concluído'
);

UPDATE public.urban_reports
SET status = 'rejected'
WHERE lower(btrim(status)) IN ('rejeitado', 'indeferido', 'cancelado');

UPDATE public.urban_reports
SET status = 'pending'
WHERE lower(btrim(status)) NOT IN ('pending', 'in_progress', 'resolved', 'rejected');

ALTER TABLE public.urban_reports
  DROP CONSTRAINT IF EXISTS urban_reports_status_check;

ALTER TABLE public.urban_reports
  ADD CONSTRAINT urban_reports_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'resolved'::text, 'rejected'::text]));

COMMENT ON COLUMN public.urban_reports.status IS
  'Estágio do protocolo (HU-5.5): pending | in_progress | resolved | rejected.';

-- === transport_reports ===
UPDATE public.transport_reports
SET status = 'pending'
WHERE status IS NULL OR btrim(status) = '';

UPDATE public.transport_reports
SET status = 'pending'
WHERE lower(btrim(status)) IN ('pendente', 'novo', 'aberto');

UPDATE public.transport_reports
SET status = 'in_progress'
WHERE lower(btrim(status)) IN (
  'em andamento',
  'em_andamento',
  'andamento',
  'em analise',
  'em análise'
);

UPDATE public.transport_reports
SET status = 'resolved'
WHERE lower(btrim(status)) IN (
  'resolvido',
  'fechado',
  'closed',
  'concluido',
  'concluído'
);

UPDATE public.transport_reports
SET status = 'rejected'
WHERE lower(btrim(status)) IN ('rejeitado', 'indeferido', 'cancelado');

UPDATE public.transport_reports
SET status = 'pending'
WHERE lower(btrim(status)) NOT IN ('pending', 'in_progress', 'resolved', 'rejected');

ALTER TABLE public.transport_reports
  DROP CONSTRAINT IF EXISTS transport_reports_status_check;

ALTER TABLE public.transport_reports
  ADD CONSTRAINT transport_reports_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'resolved'::text, 'rejected'::text]));

COMMENT ON COLUMN public.transport_reports.status IS
  'Estágio do protocolo (HU-5.5): pending | in_progress | resolved | rejected.';
