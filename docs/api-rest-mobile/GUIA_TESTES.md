# Guia de Testes - API REST Mobile

Este guia mostra como testar a implementação da API REST passo a passo.

> **📌 Nota:** Este guia foca no endpoint de vereadores, que é o único endpoint REST implementado atualmente. Para outros endpoints, veja [IMPLEMENTACAO_STATUS.md](./IMPLEMENTACAO_STATUS.md) para o status da implementação.

---

## 📋 Pré-requisitos

1. **Supabase CLI instalado e configurado**
   ```bash
   supabase --version
   ```
   > **Nota**: O Supabase CLI roda na sua máquina local, não dentro do Docker. Se você está usando Docker apenas para o frontend, instale o CLI na sua máquina.

2. **Projeto linkado ao Supabase**
   ```bash
   supabase link --project-ref vzkwkcypkfrpfhhsghwn
   ```

3. **Variáveis de ambiente configuradas** (já devem estar no Supabase Dashboard)

### 🐳 Frontend em Docker

Se você está usando Docker para o frontend:
- ✅ O backend (Edge Functions) continua rodando no Supabase Cloud
- ✅ Você faz deploy das funções usando Supabase CLI na sua máquina local
- ✅ O frontend em Docker se conecta ao backend através de `VITE_SUPABASE_URL`
- ✅ Não é necessário rodar o backend em Docker

Veja [docs/docker-infra/](../docker-infra/) para mais informações sobre Docker e [docs/INTEGRACAO_DOCKER_BACKEND.md](../INTEGRACAO_DOCKER_BACKEND.md) para entender como Docker e Backend trabalham juntos.

---

## 🚀 Passo 1: Aplicar Migrações

### Opção A: Reset completo (desenvolvimento)
```bash
# CUIDADO: Isso apaga todos os dados!
supabase db reset
```

### Opção B: Aplicar apenas novas migrações
```bash
# Aplicar migrações pendentes
supabase migration up

# Ou aplicar uma migração específica
supabase db push
```

### Verificar se as tabelas foram criadas
```bash
# Conectar ao banco e verificar
supabase db diff

# Ou verificar diretamente no Supabase Dashboard
# SQL Editor > Executar:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('api_rate_limits', 'api_cache');
```

---

## 🔧 Passo 2: Fazer Deploy da Função

### Deploy da função api-router
```bash
# Deploy da função
supabase functions deploy api-router

# Verificar se o deploy foi bem-sucedido
supabase functions list
```

### Verificar logs (opcional)
```bash
# Ver logs em tempo real
supabase functions logs api-router --follow
```

---

## 🧪 Passo 3: Testar Endpoints

### 3.1 Teste Básico - Lista de Vereadores

```bash
# Teste simples
curl https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores

# Com formatação JSON (jq necessário)
curl https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores | jq
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 55,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "cached": true,
    "timestamp": "2026-01-15T...",
    "version": "1.0",
    "requestId": "..."
  }
}
```

### 3.2 Teste com Paginação

```bash
# Página 1, 10 itens
curl "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores?page=1&limit=10"

# Página 2
curl "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores?page=2&limit=10"
```

### 3.3 Teste com Filtros

```bash
# Buscar por nome
curl "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores?search=joao"

# Filtrar por partido
curl "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores?partido=PT"

# Combinar filtros
curl "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores?search=maria&partido=PSDB&page=1&limit=5"
```

### 3.4 Teste com Ordenação

```bash
# Ordenar por nome (ascendente)
curl "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores?sort=name&order=asc"

# Ordenar por nome (descendente)
curl "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores?sort=name&order=desc"
```

### 3.5 Teste - Detalhes de um Vereador

```bash
# Primeiro, pegue um ID da lista anterior
ID="milton-leite"  # Exemplo

curl "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores/$ID"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "milton-leite",
    "name": "Milton Leite",
    "party": "DEM",
    "photo": "...",
    "phone": "...",
    "email": "...",
    ...
  },
  "meta": {
    "cached": true,
    "timestamp": "...",
    "version": "1.0",
    "requestId": "..."
  }
}
```

### 3.6 Teste - Vereador Não Encontrado

```bash
curl "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores/nao-existe"
```

**Resposta esperada (404):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Vereador não encontrado",
    "timestamp": "..."
  },
  "meta": {
    "timestamp": "...",
    "version": "1.0",
    "requestId": "..."
  }
}
```

---

## 🔍 Passo 4: Verificar Funcionalidades

### 4.1 Verificar Rate Limiting

```bash
# Fazer múltiplas requisições rapidamente
for i in {1..65}; do
  curl -s "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores" \
    -H "X-Forwarded-For: 192.168.1.100" \
    -w "\nStatus: %{http_code}\n" \
    | grep -E "(Status|RATE_LIMIT)"
done
```

**O que verificar:**
- Primeiras 60 requisições: Status 200
- 61ª requisição: Status 429 com `RATE_LIMIT_EXCEEDED`
- Headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### 4.2 Verificar Cache

```bash
# Primeira requisição (cache miss)
curl -v "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores" \
  2>&1 | grep -E "(X-Cache|Cache-Control)"

# Segunda requisição imediata (cache hit)
curl -v "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores" \
  2>&1 | grep -E "(X-Cache|Cache-Control)"
```

**O que verificar:**
- Primeira: `X-Cache: MISS`
- Segunda: `X-Cache: HIT`
- `Cache-Control: public, max-age=300` presente

### 4.3 Verificar Validação

```bash
# Teste com parâmetros inválidos
curl "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores?page=0"
curl "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores?limit=200"
curl "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores?order=invalid"
```

**Resposta esperada (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Erros de validação encontrados",
    "details": {
      "errors": [
        {
          "field": "page",
          "message": "Number must be greater than or equal to 1"
        }
      ]
    }
  }
}
```

### 4.4 Verificar Headers de Resposta

```bash
curl -I "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores"
```

**Headers esperados:**
```
Content-Type: application/json
Access-Control-Allow-Origin: *
X-Request-ID: <uuid>
X-API-Version: 1.0
X-Cache: HIT ou MISS
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: <timestamp>
```

---

## 🐛 Passo 5: Testar Cenários de Erro

### 5.1 Rota Não Encontrada

```bash
curl "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/endpoint-inexistente"
```

### 5.2 Caminho Inválido

```bash
curl "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/vereadores"
# Sem /api/v1/
```

### 5.3 Método HTTP Inválido

```bash
curl -X POST "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores"
# POST não implementado (apenas GET está disponível para vereadores)
```

**Resposta esperada (404 ou 405):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Rota não encontrada: POST /api/v1/vereadores"
  }
}
```

---

## 📊 Passo 6: Verificar no Banco de Dados

### 6.1 Verificar Rate Limits Registrados

```sql
-- No Supabase SQL Editor
SELECT 
  identifier,
  identifier_type,
  endpoint,
  COUNT(*) as request_count,
  MIN(created_at) as first_request,
  MAX(created_at) as last_request
FROM api_rate_limits
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY identifier, identifier_type, endpoint
ORDER BY last_request DESC
LIMIT 20;
```

### 6.2 Verificar Cache

```sql
-- Ver itens em cache
SELECT 
  cache_key,
  expires_at,
  created_at,
  updated_at,
  CASE 
    WHEN expires_at > NOW() THEN 'Válido'
    ELSE 'Expirado'
  END as status
FROM api_cache
ORDER BY created_at DESC
LIMIT 20;
```

### 6.3 Limpar Dados de Teste (opcional)

```sql
-- Limpar rate limits antigos
DELETE FROM api_rate_limits 
WHERE created_at < NOW() - INTERVAL '1 hour';

-- Limpar cache expirado
DELETE FROM api_cache 
WHERE expires_at < NOW();
```

---

## 🧪 Script de Teste Automatizado

### Usar o Script Existente (Recomendado)

O projeto já possui um script de teste completo em `scripts/test-api-rest.sh`:

```bash
# Executar o script de teste
./scripts/test-api-rest.sh
```

**O script testa:**
- ✅ Lista de vereadores
- ✅ Paginação
- ✅ Busca por nome
- ✅ Filtro por partido
- ✅ Ordenação
- ✅ Detalhes de vereador
- ✅ Vereador não encontrado (404)
- ✅ Validação de parâmetros inválidos
- ✅ Headers de resposta
- ✅ Headers de Rate Limit
- ✅ Headers CORS

**Requisitos:**
- `curl` instalado
- `jq` instalado (opcional, mas recomendado)
  - Linux: `sudo apt-get install jq`
  - macOS: `brew install jq`

### Criar Script Personalizado (Opcional)

Se preferir criar seu próprio script, aqui está um exemplo básico:

```bash
#!/bin/bash

BASE_URL="https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1"

echo "🧪 Testando API REST Mobile"
echo "============================"
echo ""

# Teste 1: Lista de vereadores
echo "1. Teste: Lista de vereadores"
RESPONSE=$(curl -s "$BASE_URL/vereadores")
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ Sucesso"
else
  echo "❌ Falhou"
  echo "$RESPONSE" | jq 2>/dev/null || echo "$RESPONSE"
fi
echo ""

# Teste 2: Paginação
echo "2. Teste: Paginação"
RESPONSE=$(curl -s "$BASE_URL/vereadores?page=1&limit=5")
if echo "$RESPONSE" | jq -e '.pagination.limit == 5' > /dev/null 2>&1; then
  echo "✅ Sucesso"
else
  echo "❌ Falhou"
fi
echo ""

# Teste 3: Busca
echo "3. Teste: Busca"
RESPONSE=$(curl -s "$BASE_URL/vereadores?search=joao")
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ Sucesso"
else
  echo "❌ Falhou"
fi
echo ""

# Teste 4: Validação
echo "4. Teste: Validação (deve falhar)"
RESPONSE=$(curl -s "$BASE_URL/vereadores?page=0")
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
  echo "✅ Validação funcionando"
else
  echo "❌ Validação não funcionou"
fi
echo ""

echo "============================"
echo "✅ Testes concluídos"
```

Tornar executável e rodar:
```bash
chmod +x test-api.sh
./test-api.sh
```

---

## 🔧 Troubleshooting

### Problema: "Function not found"
**Solução:** Verificar se o deploy foi feito:
```bash
supabase functions list
supabase functions deploy api-router
```

### Problema: "Table does not exist"
**Solução:** Aplicar migrações:
```bash
supabase db reset
# ou
supabase migration up
```

### Problema: "Rate limit não funciona"
**Solução:** Verificar se a tabela `api_rate_limits` existe e se as políticas RLS estão corretas.

### Problema: "Cache não funciona"
**Solução:** Verificar se a tabela `api_cache` existe e se o service role key está configurado.

### Ver logs detalhados
```bash
# Logs da função
supabase functions logs api-router --follow

# Logs do banco (se houver erros)
# Verificar no Supabase Dashboard > Logs
```

---

## 📝 Checklist de Testes

- [ ] Migrações aplicadas com sucesso
- [ ] Função deployada
- [ ] GET `/api/v1/vereadores` retorna lista
- [ ] Paginação funciona (`page`, `limit`)
- [ ] Filtros funcionam (`search`, `partido`)
- [ ] Ordenação funciona (`sort`, `order`)
- [ ] GET `/api/v1/vereadores/:id` retorna detalhes
- [ ] 404 retornado para ID inexistente
- [ ] Validação rejeita parâmetros inválidos
- [ ] Rate limiting funciona (headers presentes)
- [ ] Cache funciona (X-Cache header)
- [ ] Headers CORS presentes
- [ ] Request ID presente em todas as respostas
- [ ] Erros retornam formato padronizado

---

---

## 📚 Referências

- [IMPLEMENTACAO_STATUS.md](./IMPLEMENTACAO_STATUS.md) - Status atual da implementação
- [TESTE_RAPIDO.md](./TESTE_RAPIDO.md) - Guia rápido de testes (5 minutos)
- [README.md](./README.md) - Índice da documentação da API
- [Documentação Supabase CLI](https://supabase.com/docs/guides/cli) - Instalação e uso do CLI

---

**Última atualização:** 15 de Janeiro de 2026
