-- Fase 1: Infraestrutura RAG com pgvector

-- 1. Habilitar extensão pgvector para busca vetorial
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Criar tabela unificada de knowledge base
CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'noticia', 'audiencia', 'servico', 'legislativo', 'faq', 'vereador'
  source_id UUID,
  source_table TEXT,
  title TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding VECTOR(1536), -- Dimensão compatível com OpenAI/Google embeddings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar índice para busca vetorial usando cosine similarity
CREATE INDEX knowledge_base_embedding_idx ON public.knowledge_base 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- 4. Índices adicionais para filtros comuns
CREATE INDEX knowledge_base_content_type_idx ON public.knowledge_base(content_type);
CREATE INDEX knowledge_base_source_table_idx ON public.knowledge_base(source_table);
CREATE INDEX knowledge_base_created_at_idx ON public.knowledge_base(created_at DESC);

-- 5. Habilitar RLS
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- 6. Política de leitura pública (knowledge base é informação pública)
CREATE POLICY "Anyone can view knowledge base" 
ON public.knowledge_base 
FOR SELECT 
USING (true);

-- 7. Apenas admins podem gerenciar knowledge base
CREATE POLICY "Admins can manage knowledge base" 
ON public.knowledge_base 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 8. Função RPC para busca semântica
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_content_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  content_type TEXT,
  title TEXT,
  source_id UUID,
  source_table TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.content,
    kb.content_type,
    kb.title,
    kb.source_id,
    kb.source_table,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_base kb
  WHERE 
    kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    AND (filter_content_type IS NULL OR kb.content_type = filter_content_type)
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 9. Trigger para atualizar updated_at
CREATE TRIGGER update_knowledge_base_updated_at
BEFORE UPDATE ON public.knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Habilitar realtime para sincronização
ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_base;