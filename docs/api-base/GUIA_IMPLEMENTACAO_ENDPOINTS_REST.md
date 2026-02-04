# Guia Completo: Implementação de Endpoints REST

**Data:** Janeiro 2026  
**Objetivo:** Criar novos endpoints REST usando o `api-router`

---

## ✅ O que já está implementado

### Infraestrutura Base

1. **Router Central** (`api-router`)
   - ✅ Roteamento de requisições
   - ✅ Suporte a query parameters (`?path=recurso`)
   - ✅ Suporte a caminhos diretos (`/api/v1/recurso`)
   - ✅ Health check integrado

2. **Utilitários Compartilhados** (`shared/`)
   - ✅ `api-response.ts` - Respostas padronizadas
   - ✅ `rate-limit.ts` - Rate limiting
   - ✅ `cache.ts` - Sistema de cache
   - ✅ `validation.ts` - Validação de dados
   - ✅ `auth.ts` - Autenticação e autorização

3. **Exemplo Implementado**
   - ✅ `api/v1/vereadores` - Endpoint completo de vereadores

---

## 📋 Checklist de Implementação

Para cada novo endpoint REST, você precisa:

- [ ] **1. Criar handler** em `supabase/functions/api/v1/{recurso}/index.ts`
- [ ] **2. Implementar lógica de negócio** (buscar dados, validar, processar)
- [ ] **3. Adicionar validação** de query parameters (se necessário)
- [ ] **4. Implementar rate limiting** (usar utilitários compartilhados)
- [ ] **5. Implementar cache** (se aplicável)
- [ ] **6. Registrar rota** no `api-router/index.ts`
- [ ] **7. Testar localmente** (se tiver Supabase local)
- [ ] **8. Fazer deploy** da função `api-router`
- [ ] **9. Testar em produção**
- [ ] **10. Documentar** o endpoint

---

## 🚀 Passo a Passo: Criar um Novo Endpoint

Vamos criar um exemplo completo: **Endpoint de Notícias**

### Passo 1: Criar estrutura de diretórios

```bash
mkdir -p supabase/functions/api/v1/noticias
touch supabase/functions/api/v1/noticias/index.ts
```

### Passo 2: Criar o Handler

Crie `supabase/functions/api/v1/noticias/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { successResponse, errorResponse } from '../../../shared/api-response.ts';
import { checkRateLimit, getRateLimitConfig, getRateLimitHeaders } from '../../../shared/rate-limit.ts';
import { getCached, setCached } from '../../../shared/cache.ts';
import { validateQueryParams } from '../../../shared/validation.ts';
import { getUserFromRequest, getClientIP } from '../../../shared/auth.ts';

const CACHE_TTL = 10 * 60; // 10 minutos

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface Noticia {
  id: string;
  title: string;
  description: string;
  fullContent: string;
  link: string;
  pubDate: string;
  category: string;
  imageUrl: string | null;
}

// Schema de validação para query parameters
const NoticiaQuerySchema = {
  page: { type: 'number', default: 1, min: 1 },
  limit: { type: 'number', default: 20, min: 1, max: 100 },
  search: { type: 'string', optional: true },
  category: { type: 'string', optional: true },
  sort: { type: 'string', optional: true },
  order: { type: 'string', optional: true, enum: ['asc', 'desc'] },
};

// GET /api/v1/noticias
export async function getNoticias(req: Request): Promise<Response> {
  const url = new URL(req.url);

  try {
    // 1. Validar query params
    const validation = await validateQueryParams(NoticiaQuerySchema, url);
    if (!validation.success) {
      return validation.response;
    }
    const { page, limit, sort, order, category, search } = validation.data;

    // 2. Rate limiting
    const authInfo = await getUserFromRequest(req);
    const userRole = authInfo?.role || null;
    const identifier = authInfo?.user?.id || getClientIP(req);
    
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

    // 3. Buscar dados (com cache)
    const cacheKey = `noticias:${page}:${limit}:${category || 'all'}:${search || ''}`;
    const cached = await getCached<Noticia[]>(cacheKey, CACHE_TTL);
    
    if (cached) {
      return successResponse(cached, {
        pagination: {
          page,
          limit,
          total: cached.length,
          totalPages: Math.ceil(cached.length / limit),
          hasNext: page < Math.ceil(cached.length / limit),
          hasPrev: page > 1,
        },
        meta: { cached: true },
        headers: getRateLimitHeaders(rateLimit),
      });
    }

    // 4. Buscar do banco de dados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from('news_cache')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (category) {
      query = query.eq('category', category);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Aplicar ordenação
    if (sort === 'pub_date') {
      query = query.order('pub_date', { ascending: order === 'asc' });
    } else {
      query = query.order('pub_date', { ascending: false });
    }

    // Aplicar paginação
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transformar dados
    const noticias: Noticia[] = (data || []).map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      fullContent: item.full_content,
      link: item.link,
      pubDate: item.pub_date,
      category: item.category,
      imageUrl: item.image_url,
    }));

    // Salvar no cache (não bloqueante)
    setCached(cacheKey, noticias, CACHE_TTL).catch(err => {
      console.error('[noticias] Failed to cache:', err);
    });

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return successResponse(noticias, {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      meta: { cached: false },
      headers: getRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    console.error('[noticias] Error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'Erro ao buscar notícias',
      500
    );
  }
}

// GET /api/v1/noticias/:id
export async function getNoticiaById(
  req: Request,
  params: { id: string }
): Promise<Response> {
  try {
    // Rate limiting
    const url = new URL(req.url);
    const authInfo = await getUserFromRequest(req);
    const userRole = authInfo?.role || null;
    const identifier = authInfo?.user?.id || getClientIP(req);
    
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

    // Buscar do banco de dados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('news_cache')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return errorResponse('NOT_FOUND', 'Notícia não encontrada', 404);
    }

    const noticia: Noticia = {
      id: data.id,
      title: data.title,
      description: data.description,
      fullContent: data.full_content,
      link: data.link,
      pubDate: data.pub_date,
      category: data.category,
      imageUrl: data.image_url,
    };
    
    return successResponse(noticia, {
      meta: { cached: true },
      headers: getRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    console.error('[noticias] Error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'Erro ao buscar notícia',
      500
    );
  }
}
```

### Passo 3: Registrar no Router

Edite `supabase/functions/api-router/index.ts`:

```typescript
async function registerRoutes() {
  // Vereadores (já implementado)
  const { getVereadores, getVereadorById } = await import('../api/v1/vereadores/index.ts');
  registerRoute('GET', 'vereadores', getVereadores);
  registerRoute('GET', 'vereadores/:id', getVereadorById);
  
  // Notícias (novo)
  const { getNoticias, getNoticiaById } = await import('../api/v1/noticias/index.ts');
  registerRoute('GET', 'noticias', getNoticias);
  registerRoute('GET', 'noticias/:id', getNoticiaById);
}
```

### Passo 4: Atualizar Health Check (Opcional)

Atualize a resposta do health check em `api-router/index.ts`:

```typescript
endpoints: {
  vereadores: '/functions/v1/api-router?path=vereadores',
  vereadorById: '/functions/v1/api-router?path=vereadores/:id',
  noticias: '/functions/v1/api-router?path=noticias',
  noticiaById: '/functions/v1/api-router?path=noticias/:id',
}
```

### Passo 5: Deploy

```bash
# Deploy do api-router (inclui todas as rotas)
npx supabase functions deploy api-router

# Ou se estiver usando Supabase CLI local
supabase functions deploy api-router
```

### Passo 6: Testar

```bash
# Health check
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router"

# Lista de notícias
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/noticias"

# Com filtros
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/noticias?page=1&limit=10&category=legislativo&search=projeto"

# Detalhes
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/noticias/wp-12345"
```

---

## 📚 Padrões e Boas Práticas

### 1. Estrutura de Resposta Padrão

Todas as respostas devem seguir este formato:

```typescript
// Sucesso com dados
successResponse(data, {
  pagination?: { page, limit, total, totalPages, hasNext, hasPrev },
  meta?: { cached: boolean, ... },
  headers?: { ... }
})

// Erro
errorResponse(
  'ERROR_CODE',
  'Mensagem de erro',
  statusCode,
  { dadosAdicionais },
  { headers }
)
```

### 2. Rate Limiting

Sempre implemente rate limiting:

```typescript
const authInfo = await getUserFromRequest(req);
const userRole = authInfo?.role || null;
const identifier = authInfo?.user?.id || getClientIP(req);

const rateLimitConfig = getRateLimitConfig(userRole, url.pathname);
const rateLimit = await checkRateLimit(identifier, rateLimitConfig, req);

if (!rateLimit.allowed) {
  return errorResponse('RATE_LIMIT_EXCEEDED', ...);
}
```

### 3. Cache

Use cache para melhorar performance:

```typescript
const cacheKey = `recurso:${page}:${limit}:${filtros}`;
const cached = await getCached<DataType>(cacheKey, CACHE_TTL);

if (cached) {
  return successResponse(cached, { meta: { cached: true } });
}

// Buscar dados...
// Salvar no cache
setCached(cacheKey, data, CACHE_TTL);
```

### 4. Validação

Valide sempre os query parameters:

```typescript
const schema = {
  page: { type: 'number', default: 1, min: 1 },
  limit: { type: 'number', default: 20, min: 1, max: 100 },
  search: { type: 'string', optional: true },
};

const validation = await validateQueryParams(schema, url);
if (!validation.success) {
  return validation.response;
}
```

### 5. Tratamento de Erros

Sempre trate erros adequadamente:

```typescript
try {
  // Lógica
} catch (error) {
  console.error('[recurso] Error:', error);
  return errorResponse(
    'INTERNAL_ERROR',
    'Erro ao processar requisição',
    500
  );
}
```

---

## 🔍 Exemplos de Implementação por Tipo

### Endpoint Simples (GET lista)

```typescript
export async function getRecursos(req: Request): Promise<Response> {
  // 1. Validar
  // 2. Rate limit
  // 3. Buscar dados
  // 4. Retornar
}
```

### Endpoint com Parâmetro (GET por ID)

```typescript
export async function getRecursoById(
  req: Request,
  params: { id: string }
): Promise<Response> {
  // 1. Rate limit
  // 2. Buscar por ID
  // 3. Verificar se existe
  // 4. Retornar
}
```

### Endpoint com Autenticação

```typescript
export async function getRecursosPrivados(req: Request): Promise<Response> {
  // 1. Verificar autenticação
  const authInfo = await getUserFromRequest(req);
  if (!authInfo?.user) {
    return errorResponse('UNAUTHORIZED', 'Não autenticado', 401);
  }

  // 2. Verificar permissões (se necessário)
  if (!hasRole(authInfo.user.id, 'admin')) {
    return errorResponse('FORBIDDEN', 'Sem permissão', 403);
  }

  // 3. Continuar com lógica...
}
```

### Endpoint POST (Criar)

```typescript
export async function createRecurso(req: Request): Promise<Response> {
  // 1. Verificar autenticação
  // 2. Validar body
  const body = await req.json();
  // 3. Criar recurso
  // 4. Retornar
}
```

### Endpoint PUT (Atualizar)

```typescript
export async function updateRecurso(
  req: Request,
  params: { id: string }
): Promise<Response> {
  // 1. Verificar autenticação
  // 2. Validar body
  // 3. Verificar se existe
  // 4. Atualizar
  // 5. Retornar
}
```

### Endpoint DELETE

```typescript
export async function deleteRecurso(
  req: Request,
  params: { id: string }
): Promise<Response> {
  // 1. Verificar autenticação
  // 2. Verificar permissões
  // 3. Deletar
  // 4. Retornar
}
```

---

## 🎯 Próximos Endpoints Recomendados

Baseado na documentação existente, priorize:

1. **Notícias** (já tem tabela `news_cache`)
   - `GET /noticias` - Lista
   - `GET /noticias/:id` - Detalhes
   - `GET /noticias/search` - Busca

2. **Agenda** (já tem tabela `agenda_cache`)
   - `GET /agenda` - Lista
   - `GET /agenda/:id` - Detalhes

3. **Projetos** (requer integração com API externa)
   - `GET /projetos` - Lista
   - `GET /projetos/:id` - Detalhes
   - `GET /projetos/:id/tramitacao` - Tramitação

---

## 📝 Documentação

Após implementar, atualize:

1. `docs/ROTAS_API_ROUTER.md` - Adicionar rota na lista
2. `docs/ENDPOINTS_API_BACKEND.md` - Documentar endpoint completo
3. `docs/MAPEAMENTO_ROTAS.md` - Atualizar mapeamento

---

## 🐛 Troubleshooting

### Erro: "Rota não encontrada"

- ✅ Verifique se a rota está registrada no `api-router/index.ts`
- ✅ Verifique se o handler está exportado corretamente
- ✅ Verifique se o caminho no `path` está correto

### Erro: "Rate limit exceeded"

- ✅ Aguarde alguns segundos
- ✅ Use autenticação para limites maiores
- ✅ Verifique configuração de rate limit

### Erro: "Internal Server Error"

- ✅ Verifique os logs da Edge Function no Supabase Dashboard
- ✅ Verifique se todas as dependências estão corretas
- ✅ Verifique se as variáveis de ambiente estão configuradas

---

**Última atualização:** Janeiro 2026
