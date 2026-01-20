# Plano de Implementação: APIs para Aplicativo Mobile

**Baseado na análise:** `ANALISE_BACKEND_API_MOBILE.md`  
**Objetivo:** Transformar a estrutura atual em uma API REST confiável para mobile

---

## 🎯 Objetivo

Criar uma estrutura de API REST organizada, padronizada e confiável para consumo por aplicativos mobile, aproveitando a infraestrutura Supabase existente.

> **🐳 Nota sobre Docker:** O frontend roda em Docker (veja [docs/docker-infra/](../docker-infra/)), mas o backend (Edge Functions) roda no Supabase Cloud e é deployado via Supabase CLI. Veja [docs/api-base/INTEGRACAO_DOCKER_BACKEND.md](../api-base/INTEGRACAO_DOCKER_BACKEND.md) para entender a integração completa.

---

## 📐 Arquitetura Proposta

### Estrutura de Endpoints

**Base URL:** `https://{project-id}.supabase.co/functions/v1/api/v1`

> **Nota:** O `/functions/v1/` é parte da infraestrutura do Supabase (não é versionamento da nossa API). O `/api/v1/` é o versionamento da nossa API, permitindo evoluir para `/api/v2/` no futuro sem quebrar clientes existentes.

**Estrutura completa:**
```
https://{project-id}.supabase.co/functions/v1/api/v1/
  ├── auth/
  │   ├── POST /login
  │   ├── POST /register
  │   ├── POST /refresh
  │   └── POST /logout
  │
  ├── vereadores/
  │   ├── GET /                    # Lista de vereadores
  │   ├── GET /:id                 # Detalhes do vereador
  │   ├── GET /:id/projetos        # Projetos do vereador
  │   └── GET /:id/gastos          # Gastos do vereador
  │
  ├── projetos/
  │   ├── GET /                    # Lista de projetos
  │   ├── GET /:id                 # Detalhes do projeto
  │   ├── GET /:id/tramitacao      # Tramitação do projeto
  │   └── GET /:id/autores          # Autores do projeto
  │
  ├── sessoes/
  │   ├── GET /                    # Lista de sessões
  │   ├── GET /:id                 # Detalhes da sessão
  │   ├── GET /:id/pauta           # Pauta da sessão
  │   └── GET /:id/pauta-estendida # Pauta estendida
  │
  ├── noticias/
  │   ├── GET /                    # Lista de notícias
  │   ├── GET /:id                 # Detalhes da notícia
  │   └── GET /search              # Busca de notícias
  │
  ├── audiencias/
  │   ├── GET /                    # Lista de audiências
  │   └── GET /:id                 # Detalhes da audiência
  │
  ├── transparencia/
  │   ├── GET /vereadores/:id/creditos
  │   ├── GET /vereadores/:id/debitos
  │   ├── GET /liderancas/creditos
  │   └── GET /liderancas/debitos
  │
  └── notifications/
      ├── GET /                    # Lista de notificações
      ├── GET /:id                 # Detalhes da notificação
      ├── PUT /:id/read            # Marcar como lida
      └── PUT /:id/read-all         # Marcar todas como lidas
```

**Evolução futura:**
```
/functions/v1/api/v1/     # Versão atual (estável)
/functions/v1/api/v2/     # Versão futura (quando necessário)
```

---

## 🤔 Sobre o Versionamento de API

### Estrutura Escolhida: `/api/v1/`

**Decisão:** Usar versionamento explícito na URL com `/api/v1/`

**Por quê?**
- ✅ **Explícito e claro** - Fica evidente qual versão da API está sendo usada
- ✅ **Fácil de documentar** - URLs são autoexplicativas
- ✅ **Permite múltiplas versões simultâneas** - Podemos manter `/v1/` e `/v2/` ativas ao mesmo tempo
- ✅ **Padrão da indústria** - Segue as melhores práticas de APIs REST
- ✅ **Evolução sem quebrar clientes** - Quando precisar mudar, criamos `/v2/` e mantemos `/v1/` funcionando

**Estrutura:**
```
/functions/v1/api/v1/vereadores    # Versão atual (estável)
/functions/v1/api/v2/vereadores    # Versão futura (quando necessário)
```

**Nota sobre a redundância visual:**
- O `/functions/v1/` é parte da infraestrutura do Supabase (não controlamos isso)
- O `/api/v1/` é nosso versionamento (controlamos isso)
- Embora pareça redundante, são contextos diferentes e a clareza do versionamento vale a pena

---

## 🏗️ Implementação

### Fase 1: Estrutura Base (Semana 1) ✅ COMPLETA

> **Status:** ✅ **Fase 1 Implementada** (Janeiro 2026)  
> A estrutura base da API REST foi implementada com sucesso. Veja [IMPLEMENTACAO_STATUS.md](./IMPLEMENTACAO_STATUS.md) para detalhes do que foi implementado.

#### 1.1 Criar Router Central

**Arquivo:** `/supabase/functions/api-router/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface Route {
  method: string;
  path: string;
  handler: (req: Request, params: Record<string, string>) => Promise<Response>;
}

const routes: Route[] = [];

// Registrar rotas
function registerRoute(method: string, path: string, handler: Route['handler']) {
  routes.push({ method, path, handler });
}

// Router principal
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Remove o prefixo do Supabase (/functions/v1) e o prefixo da API (/api/v1)
  // Exemplo: /functions/v1/api/v1/vereadores -> /vereadores
  // Suporta também /api/v2/ no futuro usando regex
  const path = url.pathname.replace(/^\/functions\/v1\/api\/v\d+\//, '');
  const method = req.method;

  // Encontrar rota correspondente
  for (const route of routes) {
    const match = matchRoute(route.path, path);
    if (match && route.method === method) {
      try {
        return await route.handler(req, match.params);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: { 
              code: 'INTERNAL_ERROR', 
              message 
            } 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  // Rota não encontrada
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: { 
        code: 'NOT_FOUND', 
        message: 'Rota não encontrada' 
      } 
    }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});

// Helper para matching de rotas
function matchRoute(pattern: string, path: string): { params: Record<string, string> } | null {
  // Converte padrão como "/vereadores/:id" para regex e extrai parâmetros
  // Exemplo: "/vereadores/:id" -> "/vereadores/(?<id>[^/]+)"
  const regexPattern = pattern
    .replace(/:(\w+)/g, '(?<$1>[^/]+)')
    .replace(/\//g, '\\/');
  const regex = new RegExp(`^${regexPattern}$`);
  const match = path.match(regex);
  
  if (match && match.groups) {
    return { params: match.groups };
  }
  return null;
}
```

#### 1.2 Criar Estrutura de Resposta Padronizada

**Arquivo:** `/supabase/functions/shared/api-response.ts`

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    field?: string; // Para erros de validação
    timestamp?: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    cached?: boolean;
    timestamp?: string;
    version?: string;
    requestId?: string;
  };
}

export function successResponse<T>(
  data: T,
  options?: {
    pagination?: ApiResponse<T>['pagination'];
    meta?: ApiResponse<T>['meta'];
    status?: number;
    headers?: Record<string, string>;
  }
): Response {
  const requestId = crypto.randomUUID();
  const response: ApiResponse<T> = {
    success: true,
    data,
    pagination: options?.pagination,
    meta: {
      ...options?.meta,
      timestamp: new Date().toISOString(),
      version: '1.0',
      requestId,
    },
  };

  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'X-Request-ID': requestId,
    'X-API-Version': '1.0',
    ...options?.headers,
  };

  // Adicionar headers de cache se aplicável
  if (options?.meta?.cached) {
    responseHeaders['X-Cache'] = 'HIT';
    responseHeaders['Cache-Control'] = 'public, max-age=300';
  } else {
    responseHeaders['X-Cache'] = 'MISS';
  }

  return new Response(
    JSON.stringify(response),
    {
      status: options?.status || 200,
      headers: responseHeaders,
    }
  );
}

export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  options?: {
    details?: any;
    field?: string;
    headers?: Record<string, string>;
  }
): Response {
  const requestId = crypto.randomUUID();
  const response: ApiResponse<never> = {
    success: false,
    error: {
      code,
      message,
      details: options?.details,
      field: options?.field,
      timestamp: new Date().toISOString(),
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0',
      requestId,
    },
  };

  // Mapear códigos de erro para status HTTP apropriados
  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMIT_EXCEEDED: 429,
    INTERNAL_ERROR: 500,
    EXTERNAL_API_ERROR: 502,
    SERVICE_UNAVAILABLE: 503,
  };

  const httpStatus = statusMap[code] || status;

  return new Response(
    JSON.stringify(response),
    {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Request-ID': requestId,
        'X-API-Version': '1.0',
        ...options?.headers,
      },
    }
  );
}

// Helper para respostas de validação com múltiplos erros
export function validationErrorResponse(
  errors: Array<{ field: string; message: string; code?: string }>
): Response {
  return errorResponse(
    'VALIDATION_ERROR',
    'Erros de validação encontrados',
    400,
    {
      details: { errors },
    }
  );
}
```

#### 1.3 Implementar Rate Limiting Robusto

**Arquivo:** `/supabase/functions/shared/rate-limit.ts`

```typescript
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
```

**Migração para tabela de rate limiting:**

```sql
-- Tabela de rate limiting com suporte a múltiplos tipos de identificadores
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP, user_id, ou endpoint
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip', 'user', 'endpoint')),
  endpoint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices otimizados para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup 
  ON api_rate_limits(identifier, identifier_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup 
  ON api_rate_limits(created_at);

-- Função para limpeza automática (executar via pg_cron)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM api_rate_limits 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Criar job de limpeza (requer extensão pg_cron)
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT cleanup_old_rate_limits()');
```

#### 1.4 Implementar Sistema de Cache Persistente

**Arquivo:** `/supabase/functions/shared/cache.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CacheEntry<T> {
  key: string;
  data: T;
  expiresAt: number;
  createdAt: number;
}

// Cache em memória para hot data
const memoryCache = new Map<string, CacheEntry<any>>();
const MAX_MEMORY_CACHE_SIZE = 1000;

export async function getCached<T>(
  key: string,
  ttlSeconds: number = 300
): Promise<T | null> {
  // Verificar cache em memória primeiro
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
    return memoryEntry.data as T;
  }

  // Verificar cache no banco
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('api_cache')
    .select('data, expires_at')
    .eq('cache_key', key)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  // Atualizar cache em memória
  const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
  memoryCache.set(key, {
    key,
    data: parsedData,
    expiresAt: new Date(data.expires_at).getTime(),
    createdAt: Date.now(),
  });

  // Limpar cache antigo se necessário
  if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
    const oldestKey = Array.from(memoryCache.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt)[0][0];
    memoryCache.delete(oldestKey);
  }

  return parsedData as T;
}

export async function setCached<T>(
  key: string,
  data: T,
  ttlSeconds: number = 300
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  // Atualizar cache em memória
  memoryCache.set(key, {
    key,
    data,
    expiresAt: expiresAt.getTime(),
    createdAt: Date.now(),
  });

  // Salvar no banco (não bloqueante)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  supabase
    .from('api_cache')
    .upsert({
      cache_key: key,
      data: typeof data === 'string' ? data : JSON.stringify(data),
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .catch(err => {
      console.error('[cache] Failed to persist cache:', err);
    });
}

export async function invalidateCache(pattern: string): Promise<void> {
  // Limpar cache em memória
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }

  // Limpar cache no banco
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  await supabase
    .from('api_cache')
    .delete()
    .like('cache_key', `%${pattern}%`);
}
```

**Migração para tabela de cache:**

```sql
CREATE TABLE IF NOT EXISTS api_cache (
  cache_key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para limpeza automática
CREATE INDEX IF NOT EXISTS idx_api_cache_expires 
  ON api_cache(expires_at);

-- Função para limpeza automática
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM api_cache 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Job de limpeza (executar via pg_cron)
-- SELECT cron.schedule('cleanup-cache', '*/15 * * * *', 'SELECT cleanup_expired_cache()');
```

### Fase 2: Endpoints Principais (Semana 2) ⏳ PENDENTE

> **Status:** ⏳ **Pendente**  
> A Fase 1 foi completada. Esta fase implementará os endpoints principais além de vereadores (projetos, sessões, notícias, etc.).

#### 2.1 Endpoint de Vereadores (Implementação Robusta)

**Arquivo:** `/supabase/functions/api/v1/vereadores/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { successResponse, errorResponse } from '../../../shared/api-response.ts';
import { checkRateLimit, getRateLimitConfig, getRateLimitHeaders } from '../../../shared/rate-limit.ts';
import { getCached, setCached } from '../../../shared/cache.ts';
import { validateQueryParams, VereadorQuerySchema } from '../../../shared/validation.ts';

const CACHE_TTL = 10 * 60; // 10 minutos
const EXTERNAL_API_URL = 'https://saopaulo.sp.leg.br/vereadores-json/';

interface Vereador {
  id: string;
  name: string;
  party: string;
  photo: string;
  phone: string;
  email: string;
  initials: string;
  // ... outros campos
}

async function fetchVereadoresFromAPI(): Promise<Vereador[]> {
  const response = await fetch(EXTERNAL_API_URL, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'CamaraNaMao/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`External API error: ${response.status}`);
  }

  const data = await response.json();
  // Transformar dados da API para formato interno
  return transformVereadores(data);
}

async function getVereadoresFromCacheOrAPI(): Promise<Vereador[]> {
  const cacheKey = 'vereadores:all';
  
  // Tentar buscar do cache
  const cached = await getCached<Vereador[]>(cacheKey, CACHE_TTL);
  if (cached) {
    return cached;
  }

  // Buscar da API externa
  const vereadores = await fetchVereadoresFromAPI();
  
  // Salvar no cache (não bloqueante)
  setCached(cacheKey, vereadores, CACHE_TTL).catch(err => {
    console.error('[vereadores] Failed to cache:', err);
  });

  return vereadores;
}

// GET /api/v1/vereadores
export async function getVereadores(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const requestId = crypto.randomUUID();

  try {
    // Validar query params
    const validation = await validateQueryParams(VereadorQuerySchema, url);
    if (!validation.success) {
      return validation.response;
    }
    const { page, limit, sort, order, partido, search, ativo } = validation.data;

    // Rate limiting
    const authHeader = req.headers.get('Authorization');
    const userRole = authHeader ? await getUserRole(authHeader) : null;
    const identifier = authHeader ? await getUserId(authHeader) : getClientIP(req);
    
    const rateLimitConfig = getRateLimitConfig(userRole, url.pathname);
    const rateLimit = await checkRateLimit(identifier, rateLimitConfig, req);
    
    if (!rateLimit.allowed) {
      return errorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Limite de requisições excedido',
        429,
        { resetAt: rateLimit.resetAt },
        { headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Buscar dados
    const allVereadores = await getVereadoresFromCacheOrAPI();
    
    // Aplicar filtros
    let filtered = allVereadores;
    if (partido) {
      filtered = filtered.filter(v => v.party.toLowerCase().includes(partido.toLowerCase()));
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(v => 
        v.name.toLowerCase().includes(searchLower) ||
        v.party.toLowerCase().includes(searchLower)
      );
    }
    if (ativo !== undefined) {
      // Assumindo que todos os vereadores retornados estão ativos
      // Ajustar conforme necessário
    }

    // Ordenar
    if (sort === 'name') {
      filtered.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name, 'pt-BR');
        return order === 'asc' ? comparison : -comparison;
      });
    }

    // Paginar
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return successResponse(paginated, {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      meta: {
        cached: true,
        requestId,
      },
      headers: getRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    console.error('[vereadores] Error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'Erro ao buscar vereadores',
      500,
      { requestId }
    );
  }
}

// GET /api/v1/vereadores/:id
export async function getVereadorById(
  req: Request,
  params: { id: string }
): Promise<Response> {
  const requestId = crypto.randomUUID();

  try {
    // Rate limiting
    const authHeader = req.headers.get('Authorization');
    const userRole = authHeader ? await getUserRole(authHeader) : null;
    const identifier = authHeader ? await getUserId(authHeader) : getClientIP(req);
    
    const url = new URL(req.url);
    const rateLimitConfig = getRateLimitConfig(userRole, url.pathname);
    const rateLimit = await checkRateLimit(identifier, rateLimitConfig, req);
    
    if (!rateLimit.allowed) {
      return errorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Limite de requisições excedido',
        429,
        { resetAt: rateLimit.resetAt },
        { headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Buscar do cache ou API
    const allVereadores = await getVereadoresFromCacheOrAPI();
    const vereador = allVereadores.find(v => v.id === params.id);
    
    if (!vereador) {
      return errorResponse('NOT_FOUND', 'Vereador não encontrado', 404, { requestId });
    }
    
    return successResponse(vereador, {
      meta: {
        cached: true,
        requestId,
      },
      headers: getRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    console.error('[vereadores] Error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'Erro ao buscar vereador',
      500,
      { requestId }
    );
  }
}

// Helpers
function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0] || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

async function getUserRole(authHeader: string): Promise<string | null> {
  // Implementar busca de role do usuário
  // Retornar 'premium', 'admin', ou null
  return null;
}

async function getUserId(authHeader: string): Promise<string> {
  // Implementar extração de user_id do JWT
  return 'user-id';
}

function transformVereadores(data: any[]): Vereador[] {
  // Implementar transformação dos dados da API externa
  return [];
}
```

#### 2.2 Endpoint de Projetos

**Arquivo:** `/supabase/functions/api/v1/projetos/index.ts`

```typescript
import { successResponse, errorResponse } from '../../../shared/api-response.ts';
import { checkRateLimit } from '../../../shared/rate-limit.ts';

// GET /api/v1/projetos
export async function getProjetos(req: Request): Promise<Response> {
  const clientId = req.headers.get('x-client-id') || 'anonymous';
  const rateLimit = await checkRateLimit(clientId);
  if (!rateLimit.allowed) {
    return errorResponse(
      'RATE_LIMIT_EXCEEDED',
      'Too many requests',
      429,
      { resetAt: rateLimit.resetAt }
    );
  }

  try {
    const url = new URL(req.url);
    const ano = url.searchParams.get('ano') || new Date().getFullYear().toString();

    // Verificar cache (getFromCache e saveToCache devem ser implementadas como helpers compartilhados)
    const cached = await getFromCache(`projetos:${ano}`);
    if (cached) {
      return successResponse(cached, { meta: { cached: true } });
    }

    // Buscar da API externa SPLEGIS
    const response = await fetch(
      `https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/ProjetosPorAnoJSON?Ano=${ano}`
    );
    
    if (!response.ok) {
      throw new Error(`SPLEGIS API error: ${response.status}`);
    }
    
    const data = await response.json();

    // Salvar no cache (TTL: 1 hora = 3600 segundos)
    await saveToCache(`projetos:${ano}`, data, 3600);

    return successResponse(data, { meta: { cached: false } });
  } catch (error) {
    return errorResponse('EXTERNAL_API_ERROR', 'Erro ao buscar projetos da API externa', 500);
  }
}
```

### Fase 3: Validação e Documentação (Semana 3) ⏳ PENDENTE

> **Status:** ⏳ **Pendente**  
> Esta fase focará em validação avançada, documentação OpenAPI/Swagger e testes completos.

#### 3.1 Validação com Zod Robusta

**Arquivo:** `/supabase/functions/shared/validation.ts`

```typescript
import { z } from 'https://deno.land/x/zod/mod.ts';
import { errorResponse, validationErrorResponse } from './api-response.ts';

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transformar erros do Zod em formato padronizado
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return {
    success: false,
    response: validationErrorResponse(errors),
  };
}

// Schemas reutilizáveis
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).max(1000).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const SortSchema = z.object({
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const VereadorQuerySchema = PaginationSchema.merge(SortSchema).extend({
  partido: z.string().min(2).max(50).optional(),
  search: z.string().min(2).max(100).optional(),
  ativo: z.coerce.boolean().optional(),
});

export const ProjetoQuerySchema = PaginationSchema.merge(SortSchema).extend({
  ano: z.coerce.number().min(2000).max(2100).optional(),
  tipo: z.string().max(10).optional(),
  status: z.string().max(50).optional(),
  autor: z.string().max(100).optional(),
  search: z.string().min(2).max(100).optional(),
});

export const SessaoQuerySchema = PaginationSchema.merge(SortSchema).extend({
  ano: z.coerce.number().min(2000).max(2100).optional(),
  mes: z.coerce.number().min(1).max(12).optional(),
  dataInicial: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dataFinal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const NoticiaQuerySchema = PaginationSchema.merge(SortSchema).extend({
  categoria: z.string().max(50).optional(),
  search: z.string().min(2).max(100).optional(),
  dataInicial: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dataFinal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Helper para validar query params
export async function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  url: URL
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  const params = Object.fromEntries(url.searchParams.entries());
  return validateRequest(schema, params);
}

// Helper para validar body JSON
export async function validateBody<T>(
  schema: z.ZodSchema<T>,
  req: Request
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  try {
    const body = await req.json();
    return validateRequest(schema, body);
  } catch (err) {
    return {
      success: false,
      response: errorResponse(
        'INVALID_JSON',
        'Corpo da requisição não é um JSON válido',
        400
      ),
    };
  }
}
```

#### 3.2 Documentação OpenAPI

**Arquivo:** `/supabase/functions/api-docs/openapi.yaml`

```yaml
openapi: 3.0.0
info:
  title: Câmara na Mão API
  version: 1.0.0
  description: API REST para aplicativo mobile

paths:
  /api/v1/vereadores:
    get:
      summary: Lista de vereadores
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Sucesso
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VereadoresResponse'
```

---

## 📊 Checklist de Implementação

### Infraestrutura
- [x] ✅ Criar router central
- [x] ✅ Implementar estrutura de resposta padronizada
- [x] ✅ Configurar rate limiting
- [x] ✅ Criar sistema de cache
- [ ] ⏳ Configurar logging centralizado

### Endpoints Core
- [x] ✅ `/api/v1/vereadores` (GET, GET /:id)
- [ ] ⏳ `/api/v1/projetos` (GET, GET /:id)
- [ ] ⏳ `/api/v1/sessoes` (GET, GET /:id)
- [ ] ⏳ `/api/v1/noticias` (GET, GET /:id, GET /search)
- [ ] ⏳ `/api/v1/audiencias` (GET, GET /:id)
- [ ] ⏳ `/api/v1/transparencia` (GET endpoints)

### Funcionalidades
- [x] ✅ Paginação padronizada
- [x] ✅ Filtros e busca
- [x] ✅ Cache para APIs externas
- [x] ✅ Tratamento de erros padronizado
- [x] ✅ Validação de entrada

### Documentação
- [ ] ⏳ OpenAPI/Swagger
- [x] ✅ Exemplos de uso (em GUIA_TESTES.md)
- [x] ✅ Guia de integração mobile (este documento)

### Testes
- [ ] ⏳ Testes unitários
- [x] ✅ Testes de integração (script test-api-rest.sh)
- [ ] ⏳ Testes de carga

**Legenda:**
- ✅ Implementado
- ⏳ Pendente
- ❌ Cancelado

**📖 Status detalhado:** Veja [IMPLEMENTACAO_STATUS.md](./IMPLEMENTACAO_STATUS.md)

---

## 🚀 Próximos Passos

1. ✅ **Fase 1 Implementada** - Estrutura Base completa
2. ⏳ **Implementar Fase 2** (Endpoints Principais)
   - `/api/v1/projetos`
   - `/api/v1/sessoes`
   - `/api/v1/noticias`
   - `/api/v1/audiencias`
   - `/api/v1/transparencia`
3. ⏳ **Implementar Fase 3** (Validação e Documentação)
   - OpenAPI/Swagger
   - Testes unitários completos
   - Testes de carga
   - Logging centralizado
4. **Testes e ajustes**
5. **Deploy e documentação final**

**📖 Status detalhado:** Veja [IMPLEMENTACAO_STATUS.md](./IMPLEMENTACAO_STATUS.md) para o que já foi implementado.

---

## 📝 Notas Técnicas

### Cache Strategy

**Implementação:**
- **Tabela PostgreSQL `api_cache`** para cache persistente
- **Cache em memória** (Deno KV ou Map) para hot data
- **Estratégia:** Cache-aside com stale-while-revalidate

**TTL por tipo de dado:**
- Vereadores: 10 minutos (dados relativamente estáveis)
- Projetos: 1 hora (mudanças menos frequentes)
- Notícias: 30 minutos (atualizações regulares)
- Sessões: 15 minutos (dados dinâmicos)
- Transparência: 1 dia (dados mensais)
- Audiências: 30 minutos (eventos futuros)

**Headers HTTP:**
- `Cache-Control: public, max-age=<ttl>`
- `ETag` para validação condicional
- `Last-Modified` para cache do navegador

### Rate Limiting Strategy

**Limites por tipo:**
- **Público (não autenticado):** 60 req/min por IP
- **Autenticado:** 300 req/min por usuário
- **Premium/Admin:** 1000 req/min por usuário
- **Endpoints pesados (IA):** 10 req/min por usuário
- **Endpoints médios (relatórios):** 20 req/min por usuário

**Implementação:**
- Sliding window log para precisão
- Cache em memória para performance
- Headers de resposta: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Error Codes Padronizados

**Erros de Cliente (4xx):**
- `VALIDATION_ERROR` (400) - Erro de validação de entrada
- `UNAUTHORIZED` (401) - Não autenticado
- `FORBIDDEN` (403) - Sem permissão
- `NOT_FOUND` (404) - Recurso não encontrado
- `RATE_LIMIT_EXCEEDED` (429) - Limite de requisições excedido
- `INVALID_JSON` (400) - JSON inválido no body
- `MISSING_FIELD` (400) - Campo obrigatório ausente
- `INVALID_FORMAT` (400) - Formato inválido (email, CEP, etc.)

**Erros de Servidor (5xx):**
- `INTERNAL_ERROR` (500) - Erro interno do servidor
- `EXTERNAL_API_ERROR` (502) - Erro em API externa
- `SERVICE_UNAVAILABLE` (503) - Serviço temporariamente indisponível
- `DATABASE_ERROR` (500) - Erro de banco de dados
- `TIMEOUT` (504) - Timeout na requisição

### Segurança

**Headers de Segurança:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: default-src 'self'`

**Validação:**
- Sanitização de todos os inputs
- Validação de tipos e formatos
- Proteção contra SQL injection
- Proteção contra XSS

**Autenticação:**
- JWT com refresh tokens
- Verificação de roles em operações sensíveis
- Rate limiting diferenciado por role

---

**Última atualização:** Janeiro 2026
