# Troubleshooting: Secrets não estão sendo reconhecidos

**Data:** 2026-01-28  
**Problema:** Adicionou `AI_API_KEY` mas ainda dá erro "Missing env vars"

---

## 🔍 Possíveis Causas

1. **Secrets não foram recarregados** (mais comum)
2. **Nome do secret está errado** (case-sensitive)
3. **Edge Function precisa ser redeployada**
4. **Cache do Supabase**

---

## ✅ Soluções (Tente nesta ordem)

### Solução 1: Aguardar e Verificar Nomes (2-3 minutos)

1. **Aguarde 2-3 minutos** após adicionar o secret
2. **Verifique os nomes** (case-sensitive, sem espaços):
   - ✅ `AI_CHAT_BASE_URL` (não `ai_chat_base_url` ou `AI_CHAT_BASE_URL `)
   - ✅ `AI_API_KEY` (não `ai_api_key` ou `AI_API_KEY `)
3. **Verifique os valores**:
   - `AI_CHAT_BASE_URL` = `http://34.41.3.173:8000/v1` (sem espaços)
   - `AI_API_KEY` = `dummy` (ou qualquer string, sem espaços)

### Solução 2: Redeploy da Edge Function

O Supabase pode precisar de um redeploy para recarregar os secrets:

```bash
# No terminal, na raiz do projeto
supabase functions deploy ai-orchestrator
```

**Ou via Supabase Dashboard:**
1. Vá em **Edge Functions** > **ai-orchestrator**
2. Clique em **Deploy** ou **Redeploy**

### Solução 3: Verificar Secrets no Dashboard

1. Acesse **Project Settings** > **Edge Functions** > **Secrets**
2. Verifique se aparecem:
   - `AI_CHAT_BASE_URL`
   - `AI_API_KEY`
3. Se não aparecerem, adicione novamente

### Solução 4: Deletar e Recriar Secrets

Às vezes ajuda deletar e recriar:

1. **Delete** os secrets `AI_CHAT_BASE_URL` e `AI_API_KEY`
2. **Aguarde 1 minuto**
3. **Recrie** exatamente como abaixo:

**Secret 1:**
- Name: `AI_CHAT_BASE_URL`
- Value: `http://34.41.3.173:8000/v1`

**Secret 2:**
- Name: `AI_API_KEY`
- Value: `dummy`

4. **Aguarde 2-3 minutos**
5. **Redeploy** a Edge Function

### Solução 5: Verificar via Logs

Adicione logs temporários no código para debugar (não recomendado para produção):

```typescript
console.log('[DEBUG] AI_CHAT_BASE_URL:', Deno.env.get('AI_CHAT_BASE_URL'));
console.log('[DEBUG] AI_API_KEY:', Deno.env.get('AI_API_KEY'));
console.log('[DEBUG] AI_CHAT_MODEL:', Deno.env.get('AI_CHAT_MODEL'));
```

---

## 🔧 Comandos Úteis

### Verificar IP atual da VM

```bash
gcloud compute instances describe llm-chat-gpu \
  --zone=us-central1-b \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

### Verificar se vLLM está rodando

```bash
gcloud compute ssh llm-chat-gpu --zone=us-central1-b --command="docker ps | grep vllm"
```

### Testar API do vLLM

```bash
curl http://34.41.3.173:8000/v1/models
```

---

## 📋 Checklist Completo

Execute este checklist:

- [ ] `AI_CHAT_BASE_URL` existe no Supabase Secrets
- [ ] `AI_API_KEY` existe no Supabase Secrets
- [ ] Nomes estão **exatamente** como mostrado (case-sensitive)
- [ ] Valores não têm espaços extras
- [ ] Aguardou 2-3 minutos após adicionar
- [ ] Fez redeploy da Edge Function
- [ ] vLLM está rodando e acessível
- [ ] IP da VM está correto no `AI_CHAT_BASE_URL`

---

## 🚨 Se Nada Funcionar

### Opção A: Verificar código da Edge Function

Pode haver um bug na lógica de verificação. Verifique o arquivo:
- `supabase/functions/ai-orchestrator/index.ts` (linha ~5151)

A lógica atual é:
```typescript
const hasGenericAi = Boolean((aiChatBaseUrl && (aiChatApiKey || aiApiKey)) || (aiBaseUrl && aiApiKey));
```

Isso significa que precisa de:
- `AI_CHAT_BASE_URL` **E** (`AI_CHAT_API_KEY` **OU** `AI_API_KEY`)

---

## 📝 Nota sobre Versão da Edge Function

O log mostra `version: 13`, o que significa que a função foi deployada 13 vezes. Se você acabou de adicionar os secrets, pode ser que a versão 13 ainda não tenha os secrets.

**Solução**: Faça um redeploy para criar a versão 14 com os novos secrets.

---

**Última atualização:** 2026-01-28
