-- Tabela de cache para vereadores da API SP Legis
CREATE TABLE public.council_members_cache (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  party TEXT NOT NULL,
  photo TEXT,
  phone TEXT,
  email TEXT,
  initials TEXT,
  sala TEXT,
  andar TEXT,
  gv TEXT,
  is_leader BOOLEAN DEFAULT false,
  is_government_leader BOOLEAN DEFAULT false,
  is_substitute BOOLEAN DEFAULT false,
  is_on_leave BOOLEAN DEFAULT false,
  region TEXT,
  cached_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para ordenação por nome
CREATE INDEX idx_council_members_name ON public.council_members_cache(name);

-- Habilitar RLS
ALTER TABLE public.council_members_cache ENABLE ROW LEVEL SECURITY;

-- Política: leitura pública (dados institucionais públicos)
CREATE POLICY "Leitura pública de vereadores" 
  ON public.council_members_cache 
  FOR SELECT 
  USING (true);

-- Comentário na tabela
COMMENT ON TABLE public.council_members_cache IS 'Cache persistente de vereadores da API SP Legis para resiliência';