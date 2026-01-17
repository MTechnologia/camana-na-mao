# Teste Rápido - API REST Mobile

Guia rápido para testar a implementação em 5 minutos.

> **📦 Não tem Supabase CLI instalado?**  
> Veja a [documentação oficial do Supabase CLI](https://supabase.com/docs/guides/cli) para instalação.

> **🐳 Usando Docker para o frontend?**  
> O backend roda no Supabase Cloud, independente do Docker. Veja [docs/docker-infra/](../docker-infra/) para mais informações.

---

## ⚡ Teste Rápido (5 minutos)

### 0. Verificar Instalação (30 seg)

```bash
# Verificar se Supabase CLI está instalado
supabase --version

# Se não estiver, instale primeiro:
# Linux/Mac: brew install supabase/tap/supabase
# Ou: npm install -g supabase
# Veja: https://supabase.com/docs/guides/cli
```

### 1. Aplicar Migrações (1 min)

```bash
cd /home/andre/projetos/mtech/camana-na-mao
supabase db reset
```

### 2. Deploy da Função (1 min)

```bash
supabase functions deploy api-router
```

### 3. Teste Básico (30 seg)

```bash
curl https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores | jq
```

**Se funcionar, você verá:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {...},
  "meta": {...}
}
```

### 4. Teste Automatizado (2 min)

```bash
./scripts/test-api-rest.sh
```

---

## 🔍 Verificações Rápidas

### ✅ Funcionando se:

1. **Resposta tem estrutura correta:**
   ```bash
   curl -s "$BASE_URL/vereadores" | jq '.success'
   # Deve retornar: true
   ```

2. **Headers presentes:**
   ```bash
   curl -I "$BASE_URL/vereadores" | grep -E "(X-Request-ID|X-API-Version|X-Cache)"
   ```

3. **Paginação funciona:**
   ```bash
   curl -s "$BASE_URL/vereadores?page=1&limit=5" | jq '.pagination.limit'
   # Deve retornar: 5
   ```

4. **Validação funciona:**
   ```bash
   curl -s "$BASE_URL/vereadores?page=0" | jq '.success'
   # Deve retornar: false
   ```

---

## 🐛 Problemas Comuns

### "Function not found" ou "Requested function was not found"

**Erro:**
```json
{"code":"NOT_FOUND","message":"Requested function was not found"}
```

**Solução:**
```bash
# 1. Verificar se está deployado
supabase functions list

# 2. Se não estiver, fazer deploy
supabase functions deploy api-router

# 3. Verificar novamente
supabase functions list
```

**📖 Guia completo:** Veja [SOLUCAO_PROBLEMAS.md](./SOLUCAO_PROBLEMAS.md) para mais detalhes.

### "Table does not exist"
```bash
# Aplicar migrações
supabase db reset
# ou
supabase db push
```

### "CORS error"
- Verificar se os headers CORS estão sendo retornados
- Verificar se a função está configurada corretamente no `config.toml`
- Fazer redeploy: `supabase functions deploy api-router`

---

## 📊 Teste Completo

Para testes mais detalhados, veja [GUIA_TESTES.md](./GUIA_TESTES.md)

---

## 🆘 Ainda com Problemas?

Se você está recebendo erros como "Function not found" ou outros problemas:

1. **Veja o guia completo de solução de problemas:**
   - [SOLUCAO_PROBLEMAS.md](./SOLUCAO_PROBLEMAS.md) - Guia completo

2. **Verifique os pré-requisitos:**
   - Supabase CLI instalado
   - Login realizado
   - Projeto linkado
   - Migrações aplicadas
   - Função deployada

3. **Comandos rápidos de diagnóstico:**
   ```bash
   # Verificar status
   supabase status
   
   # Ver funções deployadas
   supabase functions list
   
   # Ver logs
   supabase functions logs api-router --follow
   ```

---

**Tempo total:** ~5 minutos (se tudo estiver configurado)
