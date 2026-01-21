# Solução de Problemas - API REST

Guia para resolver problemas comuns ao usar a API REST.

---

## ❌ Erro: "Requested function was not found"

**Sintoma:**
```json
{"code":"NOT_FOUND","message":"Requested function was not found"}
```

**Causa:** A função `api-router` não está deployada no Supabase.

**Solução:**

### 1. Verificar se Supabase CLI está instalado

```bash
supabase --version
```

Se não estiver instalado, veja a [documentação oficial do Supabase CLI](https://supabase.com/docs/guides/cli) para instalação.

### 2. Fazer login no Supabase

```bash
supabase login
```

Isso abrirá o navegador para autenticação.

### 3. Linkar o projeto

```bash
cd /home/andre/projetos/mtech/camana-na-mao
supabase link --project-ref vzkwkcypkfrpfhhsghwn
```

Você precisará do **Database Password** do projeto. Encontre em:
- Supabase Dashboard > Settings > Database > Database Password

### 4. Aplicar migrações (se necessário)

```bash
# Verificar se as tabelas existem
supabase db push

# Ou resetar completamente (CUIDADO: apaga dados!)
supabase db reset
```

### 5. Fazer deploy da função

```bash
supabase functions deploy api-router
```

**Saída esperada:**
```
Deploying function api-router...
Function api-router deployed successfully
```

### 6. Verificar se o deploy foi bem-sucedido

```bash
# Listar funções deployadas
supabase functions list
```

Você deve ver `api-router` na lista.

### 7. Testar o endpoint

```bash
curl https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {...},
  "meta": {...}
}
```

---

## ❌ Erro: "Table does not exist"

**Sintoma:**
```
Error: relation "api_rate_limits" does not exist
```

**Causa:** As migrações não foram aplicadas.

**Solução:**

```bash
# Aplicar migrações
supabase db push

# Ou resetar banco (aplica todas as migrações)
supabase db reset
```

**Verificar se as tabelas foram criadas:**

```sql
-- No Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('api_rate_limits', 'api_cache');
```

---

## ❌ Erro: "Rate limit não funciona"

**Sintoma:** Headers `X-RateLimit-*` não aparecem nas respostas.

**Causa:** Tabela `api_rate_limits` não existe ou políticas RLS estão incorretas.

**Solução:**

1. **Verificar se a tabela existe:**
   ```sql
   SELECT * FROM api_rate_limits LIMIT 1;
   ```

2. **Verificar políticas RLS:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'api_rate_limits';
   ```

3. **Aplicar migração novamente:**
   ```bash
   supabase db reset
   ```

---

## ❌ Erro: "Cache não funciona"

**Sintoma:** Header `X-Cache` sempre mostra `MISS`.

**Causa:** Tabela `api_cache` não existe ou service role key não está configurada.

**Solução:**

1. **Verificar se a tabela existe:**
   ```sql
   SELECT * FROM api_cache LIMIT 1;
   ```

2. **Verificar service role key:**
   - Supabase Dashboard > Settings > API
   - Verificar se `SUPABASE_SERVICE_ROLE_KEY` está configurada
   - A Edge Function usa essa chave automaticamente

3. **Aplicar migração novamente:**
   ```bash
   supabase db reset
   ```

---

## ❌ Erro: "CORS Error"

**Sintoma:** Erro de CORS no navegador ao fazer requisições.

**Causa:** Headers CORS não estão sendo retornados.

**Solução:**

1. **Verificar configuração no `config.toml`:**
   ```toml
   [functions.api-router]
   verify_jwt = false
   ```

2. **Verificar se a função retorna headers CORS:**
   - A função `api-response.ts` já inclui headers CORS
   - Verificar se está sendo usada corretamente

3. **Fazer redeploy:**
   ```bash
   supabase functions deploy api-router
   ```

---

## ❌ Erro: "Internal Server Error"

**Sintoma:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "..."
  }
}
```

**Causa:** Erro na execução da função.

**Solução:**

1. **Ver logs da função:**
   ```bash
   supabase functions logs api-router --follow
   ```

2. **Verificar variáveis de ambiente:**
   - Supabase Dashboard > Settings > API
   - Verificar se `SUPABASE_SERVICE_ROLE_KEY` está configurada

3. **Verificar se as dependências estão corretas:**
   - Verificar se `shared/api-response.ts` existe
   - Verificar se `shared/rate-limit.ts` existe
   - Verificar se `shared/cache.ts` existe
   - Verificar se `shared/validation.ts` existe
   - Verificar se `shared/auth.ts` existe

---

## ❌ Erro: "Invalid path"

**Sintoma:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PATH",
    "message": "Caminho da API inválido. Use /api/v1/..."
  }
}
```

**Causa:** URL incorreta.

**Solução:**

**URL correta:**
```
https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores
```

**URLs incorretas:**
```
❌ https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/vereadores
❌ https://vzkwkcypkfrpfhhsghwn.supabase.co/api/v1/vereadores
❌ https://vzkwkcypkfrpfhhsghwn.supabase.co/vereadores
```

---

## ✅ Checklist de Verificação

Use este checklist para verificar se tudo está configurado corretamente:

- [ ] Supabase CLI instalado (`supabase --version`)
- [ ] Login realizado (`supabase login`)
- [ ] Projeto linkado (`supabase link --project-ref vzkwkcypkfrpfhhsghwn`)
- [ ] Migrações aplicadas (`supabase db push` ou `supabase db reset`)
- [ ] Função deployada (`supabase functions deploy api-router`)
- [ ] Função aparece na lista (`supabase functions list`)
- [ ] Tabelas criadas (`api_rate_limits`, `api_cache`)
- [ ] Service role key configurada no Supabase Dashboard
- [ ] Endpoint responde corretamente (`curl` funciona)

---

## 🔍 Comandos de Diagnóstico

### Verificar status do projeto

```bash
supabase status
```

### Ver funções deployadas

```bash
supabase functions list
```

### Ver logs em tempo real

```bash
supabase functions logs api-router --follow
```

### Verificar conexão com banco

```bash
supabase db diff
```

### Testar endpoint diretamente

```bash
curl -v https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores
```

O flag `-v` mostra headers completos, útil para debug.

---

## 📚 Referências

- [GUIA_TESTES.md](./GUIA_TESTES.md) - Guia completo de testes
- [TESTE_RAPIDO.md](./TESTE_RAPIDO.md) - Teste rápido (5 minutos)
- [IMPLEMENTACAO_STATUS.md](./IMPLEMENTACAO_STATUS.md) - Status da implementação
- [Documentação Supabase CLI](https://supabase.com/docs/guides/cli) - Documentação oficial

---

**Última atualização:** Janeiro 2026
