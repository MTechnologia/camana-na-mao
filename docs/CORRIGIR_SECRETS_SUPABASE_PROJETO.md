# Como Corrigir Secrets do Supabase para o Projeto Correto

**Data:** 2026-01-30  
**Problema:** `SUPABASE_URL` e `SUPABASE_ANON_KEY` estão desabilitados e podem estar apontando para projeto errado

---

## 🔍 Situação

Os secrets `SUPABASE_URL` e `SUPABASE_ANON_KEY` são **gerenciados automaticamente** pelo Supabase e não podem ser editados manualmente. Eles são configurados automaticamente quando você faz `supabase link` com um projeto.

**Problema:** Se o projeto linkado estiver errado, esses secrets apontarão para o projeto errado.

---

## ✅ Solução: Verificar e Corrigir Projeto Linkado

### Passo 1: Verificar Projeto Atual

```bash
# Verificar qual projeto está linkado
supabase projects list

# Verificar status do link
supabase status
```

### Passo 2: Verificar `config.toml`

Verifique se o `project_id` está correto:

```toml
# supabase/config.toml
project_id = "vjzkzsczlbtmrzewffdx"  # Deve ser o projeto do frontend
```

### Passo 3: Fazer Link com o Projeto Correto

Se o projeto estiver errado, faça o link novamente:

```bash
# Desvincular projeto atual (se necessário)
# Não há comando direto, mas você pode editar o config.toml

# Fazer link com o projeto correto
supabase link --project-ref vjzkzsczlbtmrzewffdx
```

**Importante:** Você precisará do **access token** do Supabase. Se não tiver:

```bash
# Fazer login no Supabase CLI
supabase login
```

### Passo 4: Verificar Secrets Após Link

Após fazer o link, os secrets `SUPABASE_URL` e `SUPABASE_ANON_KEY` serão atualizados automaticamente para o projeto correto.

**Como verificar:**
1. Supabase Dashboard > **Project Settings** > **Edge Functions** > **Secrets**
2. Verifique os digests dos secrets (eles devem mudar após o link)
3. Os secrets devem apontar para: `https://vjzkzsczlbtmrzewffdx.supabase.co`

---

## 🔧 Verificação Alternativa: Via Logs

Se não conseguir verificar diretamente, você pode verificar nos logs da Edge Function:

1. Envie uma mensagem no chat
2. Verifique os logs do Supabase:
   - Supabase Dashboard > **Edge Functions** > **ai-orchestrator** > **Logs**
3. Procure por: `Using Supabase URL:`
4. Deve mostrar: `https://vjzkzsczlbtmrzewffdx.supabase.co`

---

## 📋 Checklist

- [ ] `config.toml` tem `project_id = "vjzkzsczlbtmrzewffdx"`
- [ ] `supabase link --project-ref vjzkzsczlbtmrzewffdx` executado
- [ ] Secrets atualizados automaticamente (verificar digests)
- [ ] Logs mostram URL correta do Supabase
- [ ] Chat funcionando sem erro "Invalid JWT"

---

## ⚠️ Nota Importante

**Não tente editar `SUPABASE_URL` e `SUPABASE_ANON_KEY` manualmente!**

Esses secrets são gerenciados automaticamente pelo Supabase e são atualizados quando você faz `supabase link`. Se você tentar editá-los manualmente, pode causar problemas.

---

## 🚀 Próximos Passos

1. **Verificar projeto linkado**: `supabase status`
2. **Fazer link correto**: `supabase link --project-ref vjzkzsczlbtmrzewffdx`
3. **Aguardar atualização**: Os secrets serão atualizados automaticamente
4. **Testar chat**: Deve funcionar sem erro "Invalid JWT"

---

**Última atualização:** 2026-01-30  
**Status:** Aguardando link correto do projeto
