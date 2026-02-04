# Deploy da API de Vereadores - Guia Rápido

## 🔴 Problema Atual

A URL `/functions/v1/api/v1/vereadores` não funciona porque o Supabase não suporta caminhos aninhados em Edge Functions.

## ✅ Soluções Disponíveis

### Solução 1: Usar api-router (Já Funciona)

**URL:**
```
https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router?path=vereadores
```

**Vantagens:**
- ✅ Já está deployado e funcionando
- ✅ Não requer deploy adicional

**Como usar:**
```bash
# Lista de vereadores
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router?path=vereadores"

# Com filtros
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router?path=vereadores&page=1&limit=10&search=Silva"

# Detalhes
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router?path=vereadores/joao-silva"
```

### Solução 2: Deploy da Função Proxy (URL Mais Limpa)

**Passo 1: Deploy da função proxy**

```bash
npx supabase functions deploy api-v1-vereadores
```

**Passo 2: Verificar deploy**

```bash
npx supabase functions list
```

**Passo 3: Testar**

```bash
# Lista de vereadores
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-v1-vereadores"

# Com query parameters
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-v1-vereadores?page=1&limit=10&search=Silva"

# Detalhes
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-v1-vereadores/joao-silva"
```

**Vantagens:**
- ✅ URL mais limpa e RESTful
- ✅ Não precisa de query parameter `path=`

**Desvantagens:**
- ⚠️ Requer deploy adicional
- ⚠️ Precisa criar uma função para cada recurso

## 📋 Checklist de Deploy

- [ ] Verificar se `api-router` está funcionando
- [ ] Deploy da função `api-v1-vereadores` (opcional)
- [ ] Testar acesso via `api-router`
- [ ] Testar acesso via `api-v1-vereadores` (se deployado)
- [ ] Atualizar documentação com URLs corretas
- [ ] Atualizar código do frontend/mobile (se necessário)

## 🧪 Testes

### Teste 1: Health Check do Router

```bash
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router"
```

**Esperado:** JSON com informações do router

### Teste 2: Lista de Vereadores via Router

```bash
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router?path=vereadores&limit=5"
```

**Esperado:** JSON com lista de vereadores

### Teste 3: Detalhes via Router

```bash
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router?path=vereadores/joao-silva"
```

**Esperado:** JSON com detalhes do vereador

### Teste 4: Função Proxy (se deployada)

```bash
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-v1-vereadores?limit=5"
```

**Esperado:** JSON com lista de vereadores

## 🔍 Troubleshooting

### Erro: "Requested function was not found"

**Causa:** Tentando acessar `/api/v1/vereadores` diretamente

**Solução:** Use o `api-router` com query parameter ou a função proxy

### Erro: "Rota não encontrada"

**Causa:** Rota não registrada no `api-router`

**Solução:** Verifique se as rotas estão registradas em `supabase/functions/api-router/index.ts`

### Erro: Rate Limit

**Causa:** Muitas requisições

**Solução:** Aguarde alguns segundos ou use autenticação

## 📚 Documentação Relacionada

- `docs/API_ROUTER_SOLUCAO.md` - Explicação detalhada do problema
- `docs/ENDPOINTS_API_BACKEND.md` - Documentação completa da API
- `docs/MAPEAMENTO_ROTAS.md` - Mapeamento de todas as rotas
