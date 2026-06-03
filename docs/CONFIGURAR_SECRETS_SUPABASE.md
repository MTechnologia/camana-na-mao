# Configurar Secrets no Supabase - Passo a Passo

**Data:** 2026-01-28  
**Problema:** `ai-orchestrator` não encontra variáveis de ambiente

---

## ⚠️ Problema Identificado

O código do `ai-orchestrator` verifica:
- `AI_CHAT_BASE_URL` **E** (`AI_CHAT_API_KEY` **OU** `AI_API_KEY`)

Como o vLLM não requer API key (é self-hosted), você precisa adicionar `AI_API_KEY` com qualquer valor.

---

## ✅ Solução: Adicionar Secrets no Supabase

### Passo 1: Acessar Secrets

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto (`vjzkzsczlbtmrzewffdx`)
3. Vá em **Project Settings** > **Edge Functions** > **Secrets**

### Passo 2: Adicionar/Verificar Secrets

Adicione os seguintes secrets (um por vez):

#### Secret 1: `AI_CHAT_BASE_URL` ✅

1. Clique em **Add new secret** (ou edite se já existir)
2. Configure:
   - **Name**: `AI_CHAT_BASE_URL`
   - **Value**: `http://34.41.3.173:8000/v1`
3. Clique em **Save**

#### Secret 2: `AI_API_KEY` ⚠️ **OBRIGATÓRIO**

1. Clique em **Add new secret**
2. Configure:
   - **Name**: `AI_API_KEY`
   - **Value**: `dummy` (ou qualquer string - o vLLM não usa)
3. Clique em **Save**

**Por que?** O código verifica se `AI_API_KEY` existe. Como o vLLM não requer autenticação, qualquer valor serve.

#### Secret 3: `AI_CHAT_MODEL` (Opcional)

1. Clique em **Add new secret**
2. Configure:
   - **Name**: `AI_CHAT_MODEL`
   - **Value**: `Qwen/Qwen2.5-3B-Instruct`
3. Clique em **Save**

---

## 📋 Checklist Final

Após adicionar, você deve ter:

```
✅ AI_CHAT_BASE_URL = http://34.41.3.173:8000/v1
✅ AI_API_KEY = dummy (ou qualquer valor)
✅ AI_CHAT_MODEL = Qwen/Qwen2.5-3B-Instruct (opcional)
```

---

## 🔍 Verificação

### 1. Aguardar Recarregamento

Após adicionar os secrets, aguarde **1-2 minutos** para o Supabase recarregar.

### 2. Testar no App/Web

1. Faça login no app/web
2. Abra o chat do Assistente IA
3. Envie uma mensagem de teste
4. Deve funcionar agora!

### 3. Verificar Logs

No Supabase Dashboard:
- **Edge Functions** > **ai-orchestrator** > **Logs**
- Procure por:
  - ✅ `[ai-orchestrator] Using AI_CHAT_BASE_URL: http://34.41.3.173:8000/v1`
  - ❌ Não deve aparecer mais "Missing env vars"

---

## 🐛 Troubleshooting

### Erro: "Missing env vars" continua aparecendo

**Causa**: Secrets não foram recarregados ou nome está errado.

**Solução**:
1. Verifique se os nomes estão **exatamente** como mostrado (case-sensitive)
2. Aguarde mais 2-3 minutos
3. Tente fazer deploy novamente da Edge Function:
   ```bash
   supabase functions deploy ai-orchestrator
   ```

### Erro: "Connection refused" ou timeout

**Causa**: vLLM não está acessível ou IP mudou.

**Solução**:
1. Verifique se o vLLM está rodando:
   ```bash
   gcloud compute ssh llm-chat-gpu --zone=us-central1-b --command="docker ps | grep vllm"
   ```
2. Verifique o IP atual da VM:
   ```bash
   gcloud compute instances describe llm-chat-gpu --zone=us-central1-b --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
   ```
3. Se o IP mudou, atualize `AI_CHAT_BASE_URL` no Supabase

---

## 📝 Nota Importante

**IP da VM pode mudar**: Como a VM é preemptible, o IP pode mudar a cada reinicialização. Se isso acontecer:

1. Verifique o novo IP:
   ```bash
   gcloud compute instances describe llm-chat-gpu --zone=us-central1-b --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
   ```

2. Atualize `AI_CHAT_BASE_URL` no Supabase com o novo IP

**Para produção**, considere:
- Configurar IP estático no GCP
- Usar Load Balancer
- Ou atualizar automaticamente via script

---

**Última atualização:** 2026-01-28
