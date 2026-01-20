# Rotas Implementadas no API Router

**Data:** Janeiro 2026  
**Base URL:** `https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1`

---

## ✅ Rotas Implementadas

### Vereadores

| Método | Rota | Query Parameter | Descrição | Status |
|--------|------|-----------------|-----------|--------|
| `GET` | `/api-router/vereadores` | `page`, `limit`, `search`, `partido`, `sort`, `order`, `ativo` | Lista de vereadores com paginação e filtros | ✅ |
| `GET` | `/api-router/vereadores/:id` | - | Detalhes de um vereador específico | ✅ |

**Exemplos de uso:**

```bash
# Lista de vereadores (primeira página, 20 itens)
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores?page=1&limit=20"

# Buscar por nome
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores?search=Silva"

# Filtrar por partido
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores?partido=PT"

# Detalhes de vereador
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores/joao-silva"
```

**Query Parameters disponíveis:**

- `page` (number, default: 1) - Número da página
- `limit` (number, default: 20, max: 100) - Itens por página
- `search` (string, optional) - Busca por nome ou partido
- `partido` (string, optional) - Filtrar por partido
- `sort` (string, optional) - Campo para ordenação (ex: "name")
- `order` (string, optional) - Ordem: "asc" ou "desc"
- `ativo` (boolean, optional) - Filtrar por status ativo

**Resposta (Lista):**
```json
{
  "success": true,
  "data": [
    {
      "id": "joao-silva",
      "name": "João Silva",
      "party": "PT",
      "photo": "https://...",
      "phone": "(11) 3396-1234",
      "email": "joao.silva@camara.sp.gov.br",
      "initials": "JS",
      "sala": "123",
      "andar": "5",
      "gv": "GV-1",
      "isLeader": false,
      "isGovernmentLeader": false,
      "isSubstitute": false,
      "isOnLeave": false,
      "region": "Zona Sul"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 55,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "cached": true
  }
}
```

**Resposta (Detalhes):**
```json
{
  "success": true,
  "data": {
    "id": "joao-silva",
    "name": "João Silva",
    "party": "PT",
    "photo": "https://...",
    "phone": "(11) 3396-1234",
    "email": "joao.silva@camara.sp.gov.br",
    "initials": "JS",
    "sala": "123",
    "andar": "5",
    "gv": "GV-1",
    "isLeader": false,
    "isGovernmentLeader": false,
    "isSubstitute": false,
    "isOnLeave": false,
    "region": "Zona Sul"
  },
  "meta": {
    "cached": true
  }
}
```

---

## ⏳ Rotas Planejadas (Não Implementadas)

### Projetos

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| `GET` | `/api-router/projetos` | Lista de projetos | ⏳ |
| `GET` | `/api-router/projetos/:id` | Detalhes do projeto | ⏳ |
| `GET` | `/api-router/projetos/:id/tramitacao` | Tramitação do projeto | ⏳ |
| `GET` | `/api-router/projetos/:id/autores` | Autores do projeto | ⏳ |

### Sessões

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| `GET` | `/api-router/sessoes` | Lista de sessões | ⏳ |
| `GET` | `/api-router/sessoes/:id` | Detalhes da sessão | ⏳ |
| `GET` | `/api-router/sessoes/:id/pauta` | Pauta da sessão | ⏳ |
| `GET` | `/api-router/sessoes/:id/pauta-estendida` | Pauta estendida | ⏳ |

### Notícias

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| `GET` | `/api-router/noticias` | Lista de notícias | ⏳ |
| `GET` | `/api-router/noticias/:id` | Detalhes da notícia | ⏳ |
| `GET` | `/api-router/noticias/search` | Busca de notícias | ⏳ |

### Audiências

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| `GET` | `/api-router/audiencias` | Lista de audiências | ⏳ |
| `GET` | `/api-router/audiencias/:id` | Detalhes da audiência | ⏳ |

### Transparência

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| `GET` | `/api-router/transparencia/vereadores/:id/creditos` | Créditos de vereador | ⏳ |
| `GET` | `/api-router/transparencia/vereadores/:id/debitos` | Débitos de vereador | ⏳ |
| `GET` | `/api-router/transparencia/liderancas/creditos` | Créditos de liderança | ⏳ |
| `GET` | `/api-router/transparencia/liderancas/debitos` | Débitos de liderança | ⏳ |

### Notificações

| Método | Rota | Descrição | Status | Autenticação |
|--------|------|-----------|--------|--------------|
| `GET` | `/api-router/notifications` | Lista de notificações | ⏳ | ✅ Sim |
| `GET` | `/api-router/notifications/:id` | Detalhes da notificação | ⏳ | ✅ Sim |
| `PUT` | `/api-router/notifications/:id/read` | Marcar como lida | ⏳ | ✅ Sim |
| `PUT` | `/api-router/notifications/read-all` | Marcar todas como lidas | ⏳ | ✅ Sim |

---

## 📊 Resumo

### Implementadas
- ✅ **2 rotas** de Vereadores

### Planejadas
- ⏳ **20+ rotas** em planejamento

### Total
- **22+ rotas** (2 implementadas + 20+ planejadas)

---

## 🔧 Como Adicionar Novas Rotas

### Passo 1: Criar o Handler

Crie o arquivo em `supabase/functions/api/v1/{recurso}/index.ts`:

```typescript
import { successResponse, errorResponse } from '../../../shared/api-response.ts';
import { checkRateLimit, getRateLimitConfig, getRateLimitHeaders } from '../../../shared/rate-limit.ts';
import { validateQueryParams } from '../../../shared/validation.ts';
import { getUserFromRequest, getClientIP } from '../../../shared/auth.ts';

export async function getRecursos(req: Request): Promise<Response> {
  // Implementação
  return successResponse(data);
}

export async function getRecursoById(
  req: Request,
  params: { id: string }
): Promise<Response> {
  // Implementação
  return successResponse(data);
}
```

### Passo 2: Registrar no Router

Edite `supabase/functions/api-router/index.ts`:

```typescript
async function registerRoutes() {
  // Vereadores (já implementado)
  const { getVereadores, getVereadorById } = await import('../api/v1/vereadores/index.ts');
  registerRoute('GET', 'vereadores', getVereadores);
  registerRoute('GET', 'vereadores/:id', getVereadorById);
  
  // Nova rota
  const { getRecursos, getRecursoById } = await import('../api/v1/recursos/index.ts');
  registerRoute('GET', 'recursos', getRecursos);
  registerRoute('GET', 'recursos/:id', getRecursoById);
}
```

### Passo 3: Deploy

```bash
npx supabase functions deploy api-router
```

### Passo 4: Testar

```bash
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/recursos"
```

---

## 📝 Notas Importantes

1. **Todas as rotas implementadas são públicas** (não requerem autenticação)
2. **Rate limiting** está implementado em todas as rotas
3. **Cache** está implementado para melhor performance
4. **Validação de entrada** está implementada
5. **Respostas padronizadas** seguem o formato `{ success, data, pagination?, meta? }`

---

**Última atualização:** Janeiro 2026
