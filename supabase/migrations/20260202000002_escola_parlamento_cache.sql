-- Migration: Cache para dados da Escola do Parlamento
-- Data: 2026-02-02
-- Descrição: Tabela para cachear páginas da API WordPress da Escola do Parlamento

-- 1. Tabela de cache
CREATE TABLE IF NOT EXISTS public.escola_parlamento_cache (
  id TEXT PRIMARY KEY,
  wp_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  link TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  modified TIMESTAMPTZ NOT NULL,
  parent INTEGER,
  menu_order INTEGER DEFAULT 0,
  image_url TEXT,
  category TEXT DEFAULT 'geral',
  status TEXT DEFAULT 'publish',
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_escola_parlamento_wp_id ON public.escola_parlamento_cache(wp_id);
CREATE INDEX IF NOT EXISTS idx_escola_parlamento_slug ON public.escola_parlamento_cache(slug);
CREATE INDEX IF NOT EXISTS idx_escola_parlamento_parent ON public.escola_parlamento_cache(parent);
CREATE INDEX IF NOT EXISTS idx_escola_parlamento_category ON public.escola_parlamento_cache(category);
CREATE INDEX IF NOT EXISTS idx_escola_parlamento_modified ON public.escola_parlamento_cache(modified DESC);
CREATE INDEX IF NOT EXISTS idx_escola_parlamento_menu_order ON public.escola_parlamento_cache(menu_order);

-- 3. RLS (público pode ler)
ALTER TABLE public.escola_parlamento_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view escola parlamento cache"
  ON public.escola_parlamento_cache FOR SELECT
  USING (true);

-- 4. Comentários para documentação
COMMENT ON TABLE public.escola_parlamento_cache IS 'Cache de páginas da API WordPress da Escola do Parlamento';
COMMENT ON COLUMN public.escola_parlamento_cache.wp_id IS 'ID original do WordPress';
COMMENT ON COLUMN public.escola_parlamento_cache.parent IS 'ID do parent (hierarquia de páginas)';
COMMENT ON COLUMN public.escola_parlamento_cache.category IS 'Categoria determinada automaticamente (curso, evento, material, inscricao, geral)';
