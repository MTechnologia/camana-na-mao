# Troubleshooting: Erro "Invalid JWT"

**Data:** 2026-01-30  
**Problema:** Token JWT sendo rejeitado como "Invalid JWT" mesmo após tentativas de refresh

---

## 🔍 Situação Atual

- ✅ Token está sendo encontrado (length: 862)
- ✅ Token está sendo enviado no header Authorization
- ❌ Supabase está rejeitando como "Invalid JWT"
- ❌ Erro 401 (Unauthorized) na resposta

---

## 🔍 Possíveis Causas

### 1. Token Expirado

**Sintomas:**
- Token existe mas está expirado
- Refresh token também pode estar expirado

**Verificação:**
- Verificar logs do Supabase para ver `isExpired: true`
- Verificar campo `exp` do JWT

**Solução:**
- Fazer logout e login novamente
- Limpar localStorage

### 2. Token de Projeto Diferente

**Sintomas:**
- Token é válido mas de outro projeto Supabase
- URL do frontend diferente da URL do backend

**Verificação:**
- Verificar se `CAMARA_URL` no frontend corresponde ao `SUPABASE_URL` no backend
- Verificar se o `iss` (issuer) do token corresponde ao projeto correto

**Solução:**
- Garantir que frontend e backend usam o mesmo projeto Supabase
- Verificar variáveis de ambiente

### 3. Problema com SUPABASE_ANON_KEY

**Sintomas:**
- Token válido mas Supabase não consegue validar
- Erro ao criar cliente Supabase

**Verificação:**
- Verificar se `SUPABASE_ANON_KEY` está configurado corretamente no Supabase
- Verificar se a chave corresponde ao projeto correto

**Solução:**
- Verificar secrets do Supabase
- Garantir que `SUPABASE_ANON_KEY` está correto

### 4. Token Corrompido no localStorage

**Sintomas:**
- Token existe mas está corrompido
- Formato do JWT está incorreto

**Verificação:**
- Verificar se token tem 3 partes (header.payload.signature)
- Verificar se token não está truncado

**Solução:**
- Limpar localStorage
- Fazer logout e login novamente

---

## ✅ Soluções Implementadas

### 1. Logs Detalhados

- ✅ Logar informações do token JWT (exp, iss, aud, etc)
- ✅ Verificar se token está expirado antes de validar
- ✅ Logar URL do Supabase sendo usada
- ✅ Verificar formato do JWT (3 partes)

### 2. Refresh Automático

- ✅ Sempre tentar refreshSession antes de usar
- ✅ Verificar expiração do token
- ✅ Limpar sessão inválida automaticamente

---

## 🔧 Passos para Diagnosticar

### Passo 1: Verificar Logs do Supabase

1. Supabase Dashboard > **Edge Functions** > **ai-orchestrator** > **Logs**
2. Procure por:
   - `Token payload (safe):` - Verifica se token está expirado
   - `Using Supabase URL:` - Verifica URL sendo usada
   - `JWT parts count:` - Verifica formato do JWT

### Passo 2: Verificar Console do Navegador

1. Abra DevTools (F12) > **Console**
2. Procure por:
   - `[useUnifiedAIChat] Token found, length:`
   - `[useUnifiedAIChat] Session refreshed successfully`
   - `[useUnifiedAIChat] Token is expired`

### Passo 3: Verificar Variáveis de Ambiente

1. Frontend: Verificar `CAMARA_URL` e `CAMARA_PUBLISHABLE_KEY`
2. Backend: Verificar `SUPABASE_URL` e `SUPABASE_ANON_KEY` no Supabase Dashboard
3. Garantir que ambos apontam para o mesmo projeto

### Passo 4: Limpar Sessão

1. Abra DevTools (F12) > **Application** > **Local Storage**
2. Procure por chaves do Supabase (geralmente começam com `sb-`)
3. Delete todas as chaves do Supabase
4. Recarregue a página
5. Faça login novamente

---

## 🚀 Solução Rápida

Se o problema persistir:

1. **Fazer logout** (limpa sessão inválida)
2. **Limpar localStorage** (remove tokens corrompidos)
3. **Fazer login novamente** (obtém novos tokens válidos)
4. **Testar o chat**

---

## 📝 Checklist de Verificação

- [ ] Logs do Supabase verificados (token expirado?)
- [ ] Console do navegador verificado (refresh funcionando?)
- [ ] Variáveis de ambiente verificadas (mesmo projeto?)
- [ ] localStorage limpo
- [ ] Logout e login realizados
- [ ] Versão com logs detalhados foi deployada

---

**Última atualização:** 2026-01-30  
**Status:** Aguardando logs detalhados para diagnóstico
