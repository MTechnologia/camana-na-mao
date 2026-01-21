import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifierType: 'ip' | 'user' | 'endpoint';
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

// Configurações por tipo de usuário e endpoint
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  public: { maxRequests: 60, windowMs: 60 * 1000, identifierType: 'ip' },
  authenticated: { maxRequests: 300, windowMs: 60 * 1000, identifierType: 'user' },
  premium: { maxRequests: 1000, windowMs: 60 * 1000, identifierType: 'user' },
  ai_endpoint: { maxRequests: 10, windowMs: 60 * 1000, identifierType: 'user' },
  heavy_endpoint: { maxRequests: 20, windowMs: 60 * 1000, identifierType: 'user' },
};

// Cache em memória para reduzir queries ao banco
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();
const CACHE_TTL = 1000; // 1 segundo

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  req: Request
): Promise<RateLimitResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = Date.now();
  const windowStart = now - config.windowMs;
  const cacheKey = `${identifier}:${config.identifierType}`;

  // Verificar cache em memória primeiro
  const cached = rateLimitCache.get(cacheKey);
  if (cached && cached.resetAt > now) {
    const allowed = cached.count < config.maxRequests;
    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - cached.count),
      resetAt: cached.resetAt,
      limit: config.maxRequests,
    };
  }

  try {
    // Buscar requisições no período usando sliding window
    const { data, error } = await supabase
      .from('api_rate_limits')
      .select('created_at')
      .eq('identifier', identifier)
      .eq('identifier_type', config.identifierType)
      .gte('created_at', new Date(windowStart).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[rate-limit] Database error:', error);
      // Fail open em caso de erro no banco
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: now + config.windowMs,
        limit: config.maxRequests,
      };
    }

    const requestCount = data?.length || 0;
    const allowed = requestCount < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - requestCount);
    const resetAt = now + config.windowMs;

    // Registrar nova requisição (não bloqueante)
    if (allowed) {
      supabase.from('api_rate_limits').insert({
        identifier,
        identifier_type: config.identifierType,
        endpoint: new URL(req.url).pathname,
        created_at: new Date().toISOString(),
      }).then(() => {
        // Atualizar cache
        rateLimitCache.set(cacheKey, {
          count: requestCount + 1,
          resetAt,
        });
      }).catch(err => {
        console.error('[rate-limit] Failed to log request:', err);
      });
    }

    return { allowed, remaining, resetAt, limit: config.maxRequests };
  } catch (err) {
    console.error('[rate-limit] Unexpected error:', err);
    // Fail open
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: now + config.windowMs,
      limit: config.maxRequests,
    };
  }
}

export function getRateLimitConfig(
  userRole: string | null,
  endpoint: string
): RateLimitConfig {
  // Endpoints pesados têm limites específicos
  if (endpoint.includes('/ai-orchestrator') || endpoint.includes('/generate-embeddings')) {
    return RATE_LIMIT_CONFIGS.ai_endpoint;
  }
  if (endpoint.includes('/reports') || endpoint.includes('/analytics')) {
    return RATE_LIMIT_CONFIGS.heavy_endpoint;
  }

  // Limites por role
  if (userRole === 'premium' || userRole === 'admin') {
    return RATE_LIMIT_CONFIGS.premium;
  }
  if (userRole) {
    return RATE_LIMIT_CONFIGS.authenticated;
  }
  return RATE_LIMIT_CONFIGS.public;
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetAt / 1000).toString(),
  };
}
