-- Natureza do relato urbano: reclamação, dúvida, sugestão ou elogio (além do eixo técnico de categoria OS).

ALTER TABLE public.urban_reports
  ADD COLUMN IF NOT EXISTS report_nature text;

ALTER TABLE public.urban_reports
  DROP CONSTRAINT IF EXISTS urban_reports_report_nature_check;

ALTER TABLE public.urban_reports
  ADD CONSTRAINT urban_reports_report_nature_check
  CHECK (
    report_nature IS NULL
    OR report_nature IN ('reclamacao', 'duvida', 'sugestao', 'elogio')
  );

COMMENT ON COLUMN public.urban_reports.report_nature IS
  'Tipo de contribuição do cidadão: reclamacao, duvida, sugestao, elogio.';
