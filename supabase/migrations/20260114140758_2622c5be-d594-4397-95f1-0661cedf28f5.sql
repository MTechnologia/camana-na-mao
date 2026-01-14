-- Tabela de cache para notícias do Portal da Câmara
CREATE TABLE public.news_cache (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  full_content TEXT,
  link TEXT,
  pub_date TIMESTAMPTZ,
  category TEXT DEFAULT 'legislativo',
  image_url TEXT,
  read_time TEXT DEFAULT '3 min',
  views INTEGER DEFAULT 0,
  cached_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para ordenação por data
CREATE INDEX idx_news_cache_pub_date ON public.news_cache(pub_date DESC);

-- RLS: leitura pública
ALTER TABLE public.news_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de notícias" 
ON public.news_cache 
FOR SELECT 
USING (true);