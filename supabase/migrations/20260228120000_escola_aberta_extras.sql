-- Escola Aberta: ambientes por unidade, catálogo de tipos e totais da rede.

-- Ambientes da unidade (salas, quadra, etc.) – preenchido pelo sync a partir de ambientesbyescola/{codesc}
ALTER TABLE public.public_services
  ADD COLUMN IF NOT EXISTS ambientes JSONB;

COMMENT ON COLUMN public.public_services.ambientes IS 'Lista de ambientes da unidade (Escola Aberta): [{ambiente, total}, ...]';

-- Catálogo de tipos de escola (EMEF, CEMEI, CEI, etc.) – preenchido pelo sync a partir de tipo_escola
CREATE TABLE IF NOT EXISTS public.escola_aberta_tipos (
  tipoesc TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.escola_aberta_tipos IS 'Catálogo de tipos de escola da API Escola Aberta (tipo_escola)';

-- Totais de ambientes na rede (ou por DRE) – preenchido pelo sync a partir de smeambientes
CREATE TABLE IF NOT EXISTS public.escola_aberta_rede_ambientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ambiente TEXT NOT NULL,
  total BIGINT NOT NULL,
  cod_dre TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escola_aberta_rede_ambientes_cod_dre
  ON public.escola_aberta_rede_ambientes (cod_dre);

COMMENT ON TABLE public.escola_aberta_rede_ambientes IS 'Totais de ambientes na rede SME (smeambientes) ou por DRE';

-- Leitura pública para uso no app
ALTER TABLE public.escola_aberta_tipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escola_aberta_rede_ambientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública escola_aberta_tipos"
  ON public.escola_aberta_tipos FOR SELECT USING (true);

CREATE POLICY "Leitura pública escola_aberta_rede_ambientes"
  ON public.escola_aberta_rede_ambientes FOR SELECT USING (true);
