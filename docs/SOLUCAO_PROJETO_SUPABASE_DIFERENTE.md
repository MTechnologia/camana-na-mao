# Solução: Erro "Invalid JWT" - Projeto Supabase Diferente

**Data:** 2026-01-30  
**Problema:** Token JWT sendo rejeitado como "Invalid JWT"

---

## 🔍 Problema Identificado

**Causa Raiz:** Discrepância entre projetos Supabase

- ✅ **Frontend** usa projeto: `vjzkzsczlbtmrzewffdx`
- ❌ **Backend** (`config.toml`) estava configurado para: `vzkwkcypkfrpfhhsghwn`

**Resultado:**
- Token JWT válido para `vjzkzsczlbtmrzewffdx`
- Backend tentando validar com chaves de `vzkwkcypkfrpfhhsghwn`
- Erro: "Invalid JWT"

---

## ✅ Solução Implementada

### 1. Corrigir `config.toml`

```toml
# Antes
project_id = "vzkwkcypkfrpfhhsghwn"

# Depois
project_id = "vjzkzsczlbtmrzewffdx"
```

### 2. Verificar Secrets no Supabase

Garantir que os secrets da Edge Function `ai-orchestrator` estão configurados para o projeto correto:

1. Supabase Dashboard > **Project Settings** > **Edge Functions** > **Secrets**
2. Verificar que `SUPABASE_URL` aponta para: `https://vjzkzsczlbtmrzewffdx.supabase.co`
3. Verificar que `SUPABASE_ANON_KEY` é a chave anon do projeto `vjzkzsczlbtmrzewffdx`

---

## 🔧 Como Verificar

### 1. Verificar Token JWT

O token JWT contém o `iss` (issuer) que indica o projeto:

```json
{
  "iss": "https://vjzkzsczlbtmrzewffdx.supabase.co/auth/v1",
  ...
}
```

### 2. Verificar Configuração do Frontend

```typescript
// src/integrations/supabase/client.ts
const SUPABASE_URL = import.meta.env.CAMARA_URL ?? import.meta.env.VITE_SUPABASE_URL;
// Deve ser: https://vjzkzsczlbtmrzewffdx.supabase.co
```

### 3. Verificar Configuração do Backend

```toml
# supabase/config.toml
project_id = "vjzkzsczlbtmrzewffdx"
```

---

## 📋 Checklist

- [x] `config.toml` atualizado com `project_id` correto
- [ ] Secrets do Supabase verificados (SUPABASE_URL e SUPABASE_ANON_KEY)
- [ ] Deploy da correção realizado
- [ ] Teste do chat funcionando

---

## 🚀 Próximos Passos

1. **Fazer deploy** da correção (já feito)
2. **Verificar secrets** no Supabase Dashboard
3. **Testar o chat** novamente
4. Se ainda houver erro, verificar se os secrets estão corretos

---

**Última atualização:** 2026-01-30  
**Status:** ✅ Problema identificado e corrigido
