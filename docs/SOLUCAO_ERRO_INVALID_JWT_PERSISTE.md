# Solução: Erro "Invalid JWT" Persiste Após Link

**Data:** 2026-01-30  
**Problema:** Erro "Invalid JWT" persiste mesmo após fazer `supabase link`

---

## 🔍 Situação

- ✅ `supabase link` foi executado com sucesso
- ✅ Token está sendo renovado com sucesso no frontend
- ✅ `config.toml` tem `project_id` correto
- ❌ Erro "Invalid JWT" ainda persiste

---

## ✅ Soluções (Tente nesta ordem)

### Solução 1: Redeploy da Edge Function

**Importante:** Após fazer `supabase link`, você precisa fazer **redeploy** da Edge Function para que ela use os novos secrets.

#### Via Supabase Dashboard (Recomendado)

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione o projeto `vjzkzsczlbtmrzewffdx`
3. Vá em **Edge Functions** > **ai-orchestrator**
4. Clique em **Deploy** ou **Redeploy**
5. Aguarde o deploy completar (1-2 minutos)

#### Via CLI

```bash
# Na raiz do projeto
supabase functions deploy ai-orchestrator

# ou com npx
npx supabase@latest functions deploy ai-orchestrator
```

### Solução 2: Verificar Secrets nos Logs

Após o redeploy, verifique os logs para confirmar que os secrets estão corretos:

1. Envie uma mensagem no chat
2. Acesse: **Edge Functions** > **ai-orchestrator** > **Logs**
3. Procure por: `Using Supabase URL:`
4. Deve mostrar: `https://vjzkzsczlbtmrzewffdx.supabase.co`

### Solução 3: Verificar Token nos Logs

Os logs devem mostrar informações do token:

1. Procure por: `Token payload (safe):`
2. Verifique:
   - `iss`: Deve ser `https://vjzkzsczlbtmrzewffdx.supabase.co/auth/v1`
   - `isExpired`: Deve ser `false`
   - `aud`: Deve ser `authenticated`

### Solução 4: Limpar Cache e Fazer Login Novamente

Se o problema persistir:

1. **Limpar localStorage:**
   - DevTools (F12) > **Application** > **Local Storage**
   - Delete todas as chaves do Supabase (começam com `sb-`)

2. **Fazer logout e login novamente:**
   - Isso obtém um novo token válido do projeto correto

3. **Testar o chat novamente**

### Solução 5: Verificar se Secrets Foram Atualizados

1. Supabase Dashboard > **Project Settings** > **Edge Functions** > **Secrets**
2. Verifique os **digests** (SHA256) dos secrets:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Se os digests não mudaram após o link, pode ser necessário:
   - Fazer logout e login no Supabase CLI
   - Fazer link novamente
   - Redeploy da função

---

## 🔧 Verificação Detalhada

### 1. Verificar Projeto Linkado

```bash
# Verificar qual projeto está linkado
supabase status

# Deve mostrar:
# Project URL: https://vjzkzsczlbtmrzewffdx.supabase.co
```

### 2. Verificar config.toml

```toml
# supabase/config.toml
project_id = "vjzkzsczlbtmrzewffdx"  # Deve ser este
```

### 3. Verificar Logs da Edge Function

Após enviar uma mensagem, verifique os logs:

```
[ai-orchestrator] Using Supabase URL: https://vjzkzsczlbtmrzewffdx.supabase.co
[ai-orchestrator] Token payload (safe): { iss: 'https://vjzkzsczlbtmrzewffdx.supabase.co/auth/v1', ... }
[ai-orchestrator] Auth error: { message: 'Invalid JWT', ... }
```

Se o `iss` do token não corresponder à URL do Supabase, o problema está no token.

---

## ⚠️ Problema Comum: Secrets Não Atualizados

**Sintoma:** Fez `supabase link` mas os secrets ainda apontam para projeto antigo.

**Causa:** O Supabase pode não ter atualizado os secrets automaticamente.

**Solução:**
1. Fazer logout do CLI: `supabase logout`
2. Fazer login novamente: `supabase login`
3. Fazer link novamente: `supabase link --project-ref vjzkzsczlbtmrzewffdx`
4. Redeploy da função: `supabase functions deploy ai-orchestrator`

---

## 📋 Checklist Completo

- [ ] `supabase link --project-ref vjzkzsczlbtmrzewffdx` executado
- [ ] `config.toml` tem `project_id = "vjzkzsczlbtmrzewffdx"`
- [ ] **Redeploy da Edge Function** executado (IMPORTANTE!)
- [ ] Logs mostram URL correta do Supabase
- [ ] Token não está expirado (verificar logs)
- [ ] localStorage limpo (se necessário)
- [ ] Logout e login novamente (se necessário)

---

## 🚀 Próximos Passos

1. **Fazer redeploy** da Edge Function (mais importante!)
2. **Verificar logs** para confirmar URL e token
3. **Testar o chat** novamente
4. Se ainda houver erro, verificar se o token está sendo gerado do projeto correto

---

**Última atualização:** 2026-01-30  
**Status:** Aguardando redeploy da Edge Function
