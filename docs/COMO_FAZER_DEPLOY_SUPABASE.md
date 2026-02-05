# Como Fazer Deploy no Supabase

**Data:** 2026-01-30  
**Problema:** Código atualizado localmente, mas Supabase ainda usa versão antiga

---

## 🔍 Situação Atual

O código foi atualizado e commitado no repositório, mas o Supabase ainda está usando a **versão antiga** (versão 24) que tem `tool_choice: 'auto'`, causando erro 400.

---

## ✅ Solução: Fazer Deploy da Edge Function

### Método 1: Via Supabase Dashboard (Recomendado)

1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Selecione seu projeto

2. **Acesse Edge Functions**
   - No menu lateral, clique em **Edge Functions**
   - Ou acesse diretamente: **Project Settings** > **Edge Functions**

3. **Faça Deploy da Função**
   - Clique em **ai-orchestrator**
   - Clique em **Deploy** ou **Redeploy**
   - Aguarde o deploy completar (pode levar 1-2 minutos)

### Método 2: Via Supabase CLI

Se você tem o Supabase CLI instalado:

```bash
# 1. Fazer login (se necessário)
supabase login

# 2. Linkar ao projeto (se necessário)
supabase link --project-ref vjzkzsczlbtmrzewffdx

# 3. Fazer deploy da função
supabase functions deploy ai-orchestrator
```

### Método 3: Via Git (Se configurado)

Se o projeto tem CI/CD configurado:
- O deploy pode ser automático após push para a branch `dev`
- Verifique se há workflows configurados no GitHub Actions ou similar

---

## 🔍 Verificar se o Deploy Funcionou

### 1. Verificar Versão no Log

Após o deploy, verifique os logs do Supabase:
- **Edge Functions** > **ai-orchestrator** > **Logs**
- Procure por uma nova execução
- A versão deve ser diferente de 24 (ou a data deve ser mais recente)

### 2. Verificar se o Erro Sumiu

Envie uma mensagem no chat e verifique os logs:
- ❌ **Antes:** `API error: 400 ... tool choice requires --enable-auto-tool-choice`
- ✅ **Depois:** Não deve aparecer esse erro

### 3. Verificar Logs de Requisição

Procure por:
```
[ai-orchestrator] Calling AI API: http://34.71.221.107:8000/v1/chat/completions
[ai-orchestrator] Request completed in ... ms (stream)
```

---

## ⚠️ Problemas Comuns

### Deploy não atualiza a função

**Causa:** Cache ou versão antiga ainda em uso

**Solução:**
1. Aguarde 2-3 minutos após o deploy
2. Limpe o cache do navegador
3. Tente novamente

### Erro de permissão

**Causa:** Não tem permissão para fazer deploy

**Solução:**
1. Verifique se você tem acesso de admin ao projeto
2. Peça para um admin fazer o deploy
3. Ou configure o Supabase CLI com suas credenciais

### Função não aparece

**Causa:** Função não foi criada ainda

**Solução:**
1. Verifique se a função existe em `supabase/functions/ai-orchestrator/`
2. Crie a função primeiro se necessário

### Erro: "Bundle generation timed out" (400)

**Causa:** A função `ai-orchestrator` é muito grande; o servidor do Supabase estoura o tempo ao gerar o bundle.

**Solução recomendada – usar Docker (bundle local):**
1. Inicie o **Docker Desktop** (ou outro runtime compatível: Podman, Rancher Desktop, OrbStack).
2. No terminal, na raiz do projeto:
   ```bash
   supabase functions deploy ai-orchestrator --use-docker
   ```
3. O bundle será gerado na sua máquina e só o resultado é enviado; o timeout do servidor deixa de ocorrer.

**Se não puder usar Docker:** O código já foi dividido em `lib.ts`, `lib-prompts.ts` e `lib-tools.ts` para reduzir tamanho. Se o erro continuar, a única alternativa é subir o Docker e usar `--use-docker`.

---

## 📝 Checklist de Deploy

- [ ] Código atualizado e commitado no repositório
- [ ] Acesso ao Supabase Dashboard ou CLI
- [ ] Deploy da função `ai-orchestrator` executado
- [ ] Aguardado 2-3 minutos para propagação
- [ ] Testado o chat e verificado logs
- [ ] Confirmado que erro 400 não aparece mais

---

## 🚀 Após o Deploy

1. **Teste o chat** enviando uma mensagem
2. **Verifique os logs** para confirmar que não há mais erro 400
3. **Monitore** por alguns minutos para garantir que está funcionando

---

**Última atualização:** 2026-01-30  
**Status:** Aguardando deploy no Supabase
