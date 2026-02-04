# Endpoints da API do Backend - Câmara na Mão

**Data:** Janeiro 2026  
**Base URL:** `https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1`  
**Versão da API REST:** `v1`

---

## 📋 Índice

1. [API REST Versionada (`/api/v1/`)](#api-rest-versionada-apiv1)
2. [Edge Functions Diretas](#edge-functions-diretas)
3. [APIs Externas (Proxy)](#apis-externas-proxy)

---

## 🌐 API REST Versionada (`/api/v1/`)

**Base URL:** `https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api/v1`

Todos os endpoints abaixo são acessados através do router central `api-router` e incluem:

### ⚠️ Status de Implementação

**Endpoints Implementados:**
- ✅ `GET /api/v1/vereadores` - Lista de vereadores
- ✅ `GET /api/v1/vereadores/:id` - Detalhes de vereador

**Pré-requisitos para funcionamento:**
1. **Aplicar migrações:**
   ```bash
   npx supabase@latest db push
   ```
   Ou aplicar manualmente a migração `20260115000000_api_infrastructure.sql`

2. **Deploy da Edge Function:**
   ```bash
   npx supabase@latest functions deploy api-router
   ```

3. **Verificar se está funcionando:**
   ```bash
   curl https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router
   curl https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api/v1/vereadores
   ```

**Nota:** Se os endpoints retornarem erro, verifique:
- Se as migrações foram aplicadas (tabelas `api_cache` e `api_rate_limits` existem)
- Se a função `api-router` foi deployada
- Logs da Edge Function no dashboard do Supabase
- ✅ Rate limiting
- ✅ Cache multi-camada
- ✅ Validação de entrada
- ✅ Respostas padronizadas
- ✅ Paginação
- ✅ Headers informativos (X-RateLimit-*, X-Cache, X-Request-ID)

### Vereadores

> **Status:** ✅ Implementado (requer deploy e migrações aplicadas)

#### `GET /api/v1/vereadores`
Lista de vereadores com paginação e filtros.

**Pré-requisitos:**
- Migração `20260115000000_api_infrastructure.sql` aplicada (tabelas `api_cache` e `api_rate_limits`)
- Edge Function `api-router` deployada

**Query Parameters:**
- `page` (number, default: 1) - Número da página
- `limit` (number, default: 20, max: 100) - Itens por página
- `search` (string, optional) - Busca por nome ou partido
- `partido` (string, optional) - Filtrar por partido
- `sort` (string, optional) - Campo para ordenação (ex: "name")
- `order` (string, optional) - Ordem: "asc" ou "desc"
- `ativo` (boolean, optional) - Filtrar por status ativo

**Exemplo:**
```bash
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api/v1/vereadores?page=1&limit=20&search=Silva"
```

**Resposta:**
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

#### `GET /api/v1/vereadores/:id`
Detalhes de um vereador específico.

**Pré-requisitos:**
- Migração `20260115000000_api_infrastructure.sql` aplicada
- Edge Function `api-router` deployada

**Path Parameters:**
- `id` (string) - ID do vereador (gerado a partir do nome)

**Exemplo:**
```bash
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api/v1/vereadores/joao-silva"
```

**Resposta:**
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

### Health Check

#### `GET /api-router`
Endpoint de health check do router.

**Exemplo:**
```bash
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router"
```

**Resposta:**
```json
{
  "success": true,
  "message": "API Router está funcionando",
  "version": "1.0",
  "endpoints": {
    "vereadores": "/functions/v1/api/v1/vereadores",
    "vereadorById": "/functions/v1/api/v1/vereadores/:id"
  },
  "example": "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api/v1/vereadores"
}
```

---

## 🔧 Edge Functions Diretas

**Base URL:** `https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1`

Estes endpoints são acessados diretamente, sem passar pelo router central.

### Dados Públicos (Sem Autenticação)

#### `POST /fetch-vereadores`
Busca lista de vereadores da API SP Legis com cache.

**Autenticação:** Não requerida (`verify_jwt = false`)

**Body:** Opcional (vazio)

**Resposta:**
```json
{
  "vereadores": [
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
      "isOnLeave": false
    }
  ],
  "cached": true,
  "source": "memory",
  "count": 55,
  "cachedAt": "2026-01-19T15:30:36.389Z"
}
```

**Características:**
- Cache em memória (10 minutos)
- Cache em banco de dados (fallback)
- Busca da API SP Legis quando necessário

#### `POST /fetch-noticias`
Busca notícias do Portal da Câmara (WordPress API).

**Autenticação:** Não requerida (`verify_jwt = false`)

**Body:** Opcional (vazio)

**Resposta:**
```json
{
  "noticias": [
    {
      "id": "wp-12345",
      "title": "Título da Notícia",
      "description": "Descrição resumida...",
      "fullContent": "<p>Conteúdo completo...</p>",
      "link": "https://www.saopaulo.sp.leg.br/...",
      "pubDate": "2026-01-19T10:00:00Z",
      "category": "legislativo",
      "imageUrl": "https://...",
      "readTime": "5 min",
      "source": "Portal da Câmara Municipal de São Paulo"
    }
  ],
  "source": "api"
}
```

**Características:**
- Cache em memória (10 minutos)
- Cache em banco de dados (`news_cache`)
- Busca da WordPress API quando necessário
- Categorização automática

#### `POST /fetch-agenda`
Busca agenda cerimonial da Câmara (WordPress API).

**Autenticação:** Não requerida (`verify_jwt = false`)

**Body:** Opcional (vazio)

**Resposta:**
```json
{
  "agenda": [
    {
      "id": "wp-12345-0",
      "title": "Sessão Solene",
      "description": "Descrição do evento...",
      "link": "https://www.saopaulo.sp.leg.br/...",
      "eventDate": "2026-01-20",
      "eventTime": "14:00 - 16:00",
      "location": "Plenário",
      "eventType": "sessao",
      "organizer": "Presidência",
      "source": "Portal da Câmara",
      "imageUrl": "https://..."
    }
  ],
  "source": "api",
  "count": 15
}
```

**Características:**
- Cache em memória (10 minutos)
- Cache em banco de dados (`agenda_cache`)
- Busca da WordPress API quando necessário
- Processa múltiplos eventos por post

### Serviços com Autenticação

#### `POST /suggest-council-members`
Sugere vereadores baseado em dados de um relato.

**Autenticação:** Requerida (`verify_jwt = true`)

**Body:**
```json
{
  "reportData": {
    "category": "iluminacao",
    "subcategory": "poste_apagado",
    "description": "Poste apagado na rua X",
    "report_type": "urban",
    "severity": "high",
    "neighborhood": "Vila Mariana",
    "region": "Zona Sul"
  },
  "vereadores": [
    {
      "id": "joao-silva",
      "name": "João Silva",
      "party": "PT",
      "region": "Zona Sul"
    }
  ]
}
```

**Resposta:**
```json
{
  "suggestions": [
    {
      "vereador": {
        "id": "joao-silva",
        "name": "João Silva",
        "party": "PT"
      },
      "matchScore": 85,
      "matchReasons": [
        "Partido atua em: urbanismo, infraestrutura",
        "Palavras-chave coincidem com atuação do partido"
      ]
    }
  ],
  "fallback": false
}
```

**Características:**
- Algoritmo de matching baseado em temas do partido
- Score de 0-100
- Retorna top 5 sugestões
- Fallback para líderes se não encontrar matches

#### `POST /ai-orchestrator`
Orquestrador de IA para conversas contextuais.

**Autenticação:** Requerida (`verify_jwt = true`)

**Body:**
```json
{
  "message": "Quero fazer um relato sobre iluminação",
  "conversationId": "uuid",
  "userId": "uuid"
}
```

**Características:**
- Processamento de intenções
- Integração com serviços externos
- Contexto de conversação

#### `POST /analyze-sentiment`
Análise de sentimento de textos.

**Autenticação:** Requerida (`verify_jwt = true`)

**Body:**
```json
{
  "text": "Texto para análise"
}
```

#### `POST /recommend-services`
Recomenda serviços públicos baseado em localização e contexto.

**Autenticação:** Requerida (`verify_jwt = true`)

**Body:**
```json
{
  "location": {
    "lat": -23.5505,
    "lng": -46.6333
  },
  "context": "saude"
}
```

#### `POST /send-notification`
Envia notificações push para usuários.

**Autenticação:** Requerida (`verify_jwt = true`)

**Body:**
```json
{
  "userId": "uuid",
  "title": "Título",
  "body": "Corpo da notificação",
  "data": {}
}
```

#### `POST /generate-embeddings`
Gera embeddings de texto para busca semântica.

**Autenticação:** Requerida (`verify_jwt = true`)

**Body:**
```json
{
  "text": "Texto para gerar embedding"
}
```

#### `POST /populate-knowledge-base`
Popula base de conhecimento com dados.

**Autenticação:** Requerida (`verify_jwt = true`)

**Body:**
```json
{
  "data": []
}
```

#### `POST /notify-n8n`
Notifica sistema N8N sobre eventos.

**Autenticação:** Requerida (`verify_jwt = true`)

**Body:**
```json
{
  "event": "report_created",
  "data": {}
}
```

#### `POST /delete-user`
Deleta usuário e dados relacionados.

**Autenticação:** Requerida (`verify_jwt = true`)

**Body:**
```json
{
  "userId": "uuid"
}
```

### Serviços Externos (Sem Autenticação)

#### `POST /google-places-autocomplete`
Autocomplete de endereços usando Google Places API.

**Autenticação:** Não requerida (`verify_jwt = false`)

**Body:**
```json
{
  "input": "Rua das Flores",
  "location": {
    "lat": -23.5505,
    "lng": -46.6333
  }
}
```

#### `POST /google-places-details`
Detalhes de um lugar usando Google Places API.

**Autenticação:** Não requerida (`verify_jwt = false`)

**Body:**
```json
{
  "placeId": "ChIJ..."
}
```

### Webhooks (Sem Autenticação)

#### `POST /n8n-webhook`
Webhook para integração com N8N.

**Autenticação:** Não requerida (`verify_jwt = false`)

#### `POST /n8n-callback`
Callback para integração com N8N.

**Autenticação:** Não requerida (`verify_jwt = false`)

---

## 🌍 APIs Externas (Proxy)

O backend também funciona como proxy para APIs externas da Câmara Municipal de São Paulo.

### SPLEGIS - Web Services Legislativos

**Base URL:** `https://splegisws.saopaulo.sp.leg.br`

Estes endpoints são acessados através de proxies implementados nas Edge Functions:

- **Audiências Públicas:** `GET /ws/ws2.asmx/AudienciasPublicasJSON`
- **Pautas de Sessões:** `GET /ws/ws2.asmx/PautasSessoesPlenariasJSON`
- **Pauta Estendida:** `GET /ws/ws2.asmx/PautaEstendidaSessaoPlenariaJSON`
- **Projetos por Ano:** `GET /ws/ws2.asmx/ProjetosPorAnoJSON`
- **Vereadores CMSP:** `GET /ws/ws2.asmx/VereadoresCMSPJSON`
- **Resumo de Projeto:** `GET /ws/ws2.asmx/ProjetoResumoJSON`
- **Matérias e Eventos:** `GET /ws/ws2.asmx/MateriasEventosJSON`
- **Autores de Projetos:** `GET /ws/ws2.asmx/ProjetosAutoresJSON`
- **Comissões:** `GET /ws/ws2.asmx/ComissoesCMSPJSON`
- **Tipos de Matéria:** `GET /ws/ws2.asmx/TiposDeMateriaJSON`
- **Áreas de Tramitação:** `GET /ws/ws2.asmx/AreasDeTramitacaoJSON`
- **Catálogo de Assuntos:** `GET /ws/ws2.asmx/CatalogoDeAssuntosJSON`

### SP LEG - WordPress REST API

**Base URL:** `https://www.saopaulo.sp.leg.br/wp-json`

- **Agenda Cerimonial:** `GET /wp/v2/agenda_cerimonial` (proxy via `fetch-agenda`)
- **Vereadores:** `GET /wp/v2/vereador` (proxy via `fetch-vereadores`)
- **Notícias:** `GET /wp/v2/posts` (proxy via `fetch-noticias`)

### SISGV - Sistema de Gestão de Verba

**Base URL:** `https://sisgvconsulta.saopaulo.sp.leg.br`

- **Créditos de Vereador:** `POST /ws/Servicos.asmx/ObterCreditoVereadorJSON`
- **Débitos de Vereador:** `POST /ws/Servicos.asmx/ObterDebitoVereadorJSON`
- **Créditos de Liderança:** `POST /ws/Servicos.asmx/ObterCreditoLiderancaJSON`
- **Débitos de Liderança:** `POST /ws/Servicos.asmx/ObterDebitoLiderancaJSON`

---

## 🔐 Autenticação

### Endpoints Públicos (Sem JWT)
- `/api/v1/vereadores`
- `/api/v1/vereadores/:id`
- `/fetch-vereadores`
- `/fetch-noticias`
- `/fetch-agenda`
- `/google-places-autocomplete`
- `/google-places-details`
- `/n8n-webhook`
- `/n8n-callback`

### Endpoints Protegidos (Requerem JWT)
- `/suggest-council-members`
- `/ai-orchestrator`
- `/analyze-sentiment`
- `/recommend-services`
- `/send-notification`
- `/generate-embeddings`
- `/populate-knowledge-base`
- `/notify-n8n`
- `/delete-user`

**Como autenticar:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/suggest-council-members
```

---

## 📊 Rate Limiting

### Limites por Tipo de Usuário

- **Público (não autenticado):** 60 req/min por IP
- **Autenticado:** 300 req/min por usuário
- **Premium/Admin:** 1000 req/min por usuário
- **Endpoints pesados (IA, relatórios):** 10-20 req/min

### Headers de Rate Limit

Todas as respostas incluem headers informativos:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642680000
```

---

## 🗄️ Cache

### Estratégia Multi-Camada

1. **Cache em Memória** (primeira camada)
   - TTL: 10 minutos
   - Mais rápido

2. **Cache em Banco de Dados** (segunda camada)
   - Tabelas: `council_members_cache`, `news_cache`, `agenda_cache`
   - Fallback quando API externa falha

3. **Cache de API Externa** (terceira camada)
   - Busca direta quando cache interno expira

### Headers de Cache

```
X-Cache: HIT
X-Cache-Source: memory
X-Cache-Age: 300
```

---

## 📝 Respostas Padronizadas

### Sucesso

```json
{
  "success": true,
  "data": {},
  "pagination": {},
  "meta": {
    "timestamp": "2026-01-19T15:30:36.389Z",
    "version": "1.0",
    "requestId": "uuid"
  }
}
```

### Erro

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensagem de erro",
    "details": {},
    "timestamp": "2026-01-19T15:30:36.389Z"
  },
  "meta": {
    "timestamp": "2026-01-19T15:30:36.389Z",
    "version": "1.0",
    "requestId": "uuid"
  }
}
```

### Códigos de Erro Comuns

- `INVALID_PATH` - Caminho da API inválido
- `NOT_FOUND` - Recurso não encontrado
- `VALIDATION_ERROR` - Erro de validação de entrada
- `RATE_LIMIT_EXCEEDED` - Limite de requisições excedido
- `UNAUTHORIZED` - Não autenticado
- `FORBIDDEN` - Sem permissão
- `INTERNAL_ERROR` - Erro interno do servidor

---

## 🚀 Próximos Endpoints Planejados

### API REST (`/api/v1/`)

- [ ] `GET /api/v1/projetos` - Lista de projetos
- [ ] `GET /api/v1/projetos/:id` - Detalhes do projeto
- [ ] `GET /api/v1/projetos/:id/tramitacao` - Tramitação do projeto
- [ ] `GET /api/v1/projetos/:id/autores` - Autores do projeto
- [ ] `GET /api/v1/sessoes` - Lista de sessões
- [ ] `GET /api/v1/sessoes/:id` - Detalhes da sessão
- [ ] `GET /api/v1/sessoes/:id/pauta` - Pauta da sessão
- [ ] `GET /api/v1/sessoes/:id/pauta-estendida` - Pauta estendida
- [ ] `GET /api/v1/noticias` - Lista de notícias
- [ ] `GET /api/v1/noticias/:id` - Detalhes da notícia
- [ ] `GET /api/v1/noticias/search` - Busca de notícias
- [ ] `GET /api/v1/audiencias` - Lista de audiências
- [ ] `GET /api/v1/audiencias/:id` - Detalhes da audiência
- [ ] `GET /api/v1/transparencia/vereadores/:id/creditos` - Créditos de vereador
- [ ] `GET /api/v1/transparencia/vereadores/:id/debitos` - Débitos de vereador
- [ ] `GET /api/v1/transparencia/liderancas/creditos` - Créditos de liderança
- [ ] `GET /api/v1/transparencia/liderancas/debitos` - Débitos de liderança
- [ ] `GET /api/v1/notifications` - Lista de notificações
- [ ] `GET /api/v1/notifications/:id` - Detalhes da notificação
- [ ] `PUT /api/v1/notifications/:id/read` - Marcar como lida
- [ ] `PUT /api/v1/notifications/read-all` - Marcar todas como lidas

---

## 📚 Documentação Relacionada

- [GUIA_TESTES.md](../api-rest-mobile/GUIA_TESTES.md) - Como testar os endpoints
- [IMPLEMENTACAO_STATUS.md](../api-rest-mobile/IMPLEMENTACAO_STATUS.md) - Status da implementação
- [ENDPOINTS_APLICACAO_MOBILE.md](../api-rest-mobile/ENDPOINTS_APLICACAO_MOBILE.md) - Guia para aplicação mobile
- [ANALISE_BACKEND_API_MOBILE.md](../api-rest-mobile/ANALISE_BACKEND_API_MOBILE.md) - Análise técnica detalhada

---

**Última atualização:** Janeiro 2026  
**Versão do documento:** 1.0
