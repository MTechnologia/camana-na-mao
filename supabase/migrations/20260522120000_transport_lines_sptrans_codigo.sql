-- NREF005 — vínculo com API Olho Vivo (código interno SPTrans `cl`).

ALTER TABLE public.transport_lines
  ADD COLUMN IF NOT EXISTS sptrans_codigo_linha INTEGER;

COMMENT ON COLUMN public.transport_lines.sptrans_codigo_linha IS
  'Código da linha na API Olho Vivo / SPTrans (campo cl).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_transport_lines_sptrans_codigo
  ON public.transport_lines (sptrans_codigo_linha)
  WHERE sptrans_codigo_linha IS NOT NULL;
