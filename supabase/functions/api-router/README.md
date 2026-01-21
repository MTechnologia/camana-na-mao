# API Router - Estrutura REST para Mobile

Este é o router central que gerencia todas as rotas da API REST versionada (`/api/v1/`).

## Estrutura

```
/functions/v1/api/v1/
  ├── vereadores/
  │   ├── GET /                    # Lista de vereadores
  │   └── GET /:id                 # Detalhes do vereador
  └── ...
```

## Como Adicionar Novas Rotas

1. Crie o endpoint em `/supabase/functions/api/v1/{recurso}/index.ts`
2. Exporte as funções handlers (ex: `getVereadores`, `getVereadorById`)
3. Registre a rota em `/supabase/functions/api-router/index.ts`:

```typescript
// No arquivo api-router/index.ts
const { getVereadores, getVereadorById } = await import('../api/v1/vereadores/index.ts');
registerRoute('GET', 'vereadores', getVereadores);
registerRoute('GET', 'vereadores/:id', getVereadorById);
```

## Exemplo de Endpoint

```typescript
import { successResponse, errorResponse } from '../../../shared/api-response.ts';
import { checkRateLimit, getRateLimitConfig, getRateLimitHeaders } from '../../../shared/rate-limit.ts';
import { validateQueryParams, VereadorQuerySchema } from '../../../shared/validation.ts';
import { getUserFromRequest, getClientIP } from '../../../shared/auth.ts';

export async function getVereadores(req: Request): Promise<Response> {
  // 1. Validar query params
  const validation = await validateQueryParams(VereadorQuerySchema, new URL(req.url));
  if (!validation.success) return validation.response;

  // 2. Rate limiting
  const authInfo = await getUserFromRequest(req);
  const rateLimit = await checkRateLimit(/* ... */);
  if (!rateLimit.allowed) {
    return errorResponse('RATE_LIMIT_EXCEEDED', /* ... */);
  }

  // 3. Buscar dados
  const data = await fetchData();

  // 4. Retornar resposta padronizada
  return successResponse(data, {
    pagination: { /* ... */ },
    headers: getRateLimitHeaders(rateLimit),
  });
}
```

## Testando

```bash
# Lista de vereadores
curl https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores

# Detalhes de um vereador
curl https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores/{id}
```

## Recursos Compartilhados

- `shared/api-response.ts` - Respostas padronizadas
- `shared/rate-limit.ts` - Rate limiting
- `shared/cache.ts` - Sistema de cache
- `shared/validation.ts` - Validação com Zod
- `shared/auth.ts` - Autenticação e autorização
