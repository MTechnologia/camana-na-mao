-- Migração: Infraestrutura de API (Rate Limiting e Cache)
-- Data: 2026-01-15

-- ============================================
-- TABELA: api_rate_limits
-- ============================================
-- Tabela de rate limiting com suporte a múltiplos tipos de identificadores
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP, user_id, ou endpoint
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip', 'user', 'endpoint')),
  endpoint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices otimizados para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup 
  ON public.api_rate_limits(identifier, identifier_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup 
  ON public.api_rate_limits(created_at);

-- Função para limpeza automática
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.api_rate_limits 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON TABLE public.api_rate_limits IS 'Registra requisições para controle de rate limiting';
COMMENT ON COLUMN public.api_rate_limits.identifier IS 'IP, user_id ou endpoint identificador';
COMMENT ON COLUMN public.api_rate_limits.identifier_type IS 'Tipo do identificador: ip, user ou endpoint';

-- ============================================
-- TABELA: api_cache
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_cache (
  cache_key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para limpeza automática
CREATE INDEX IF NOT EXISTS idx_api_cache_expires 
  ON public.api_cache(expires_at);

-- Função para limpeza automática
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.api_cache 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON TABLE public.api_cache IS 'Cache persistente para respostas de API';
COMMENT ON COLUMN public.api_cache.cache_key IS 'Chave única do cache';
COMMENT ON COLUMN public.api_cache.data IS 'Dados em formato JSONB';
COMMENT ON COLUMN public.api_cache.expires_at IS 'Data de expiração do cache';

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================

-- Rate limits: apenas service role pode acessar
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate limits"
  ON public.api_rate_limits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Cache: apenas service role pode acessar
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage cache"
  ON public.api_cache
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- NOTAS SOBRE LIMPEZA AUTOMÁTICA
-- ============================================
-- Para habilitar limpeza automática via pg_cron (se disponível):
-- 
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT public.cleanup_old_rate_limits()');
-- SELECT cron.schedule('cleanup-cache', '*/15 * * * *', 'SELECT public.cleanup_expired_cache()');
--
-- Alternativamente, pode ser executado manualmente ou via Edge Function periódica
