# Como Verificar se a VM Está Causando Lentidão

**Data:** 2026-01-31  
**Problema:** APK lento com mensagem "O serviço está demorando mais que o normal"

---

## 🔍 Verificação Rápida (5 minutos)

### Passo 1: Verificar Status da VM no GCP

1. **Acesse:** https://console.cloud.google.com/compute/instances
2. **Procure por:** `llm-chat-gpu-l4`
3. **Verifique:**
   - ✅ Status deve ser **RUNNING** (verde)
   - ✅ Última atividade deve ser recente
   - ✅ IP Externo: `34.71.221.107`

**Se estiver STOPPED (vermelho):**
- Clique em **START**
- Aguarde 2-3 minutos
- Teste novamente

---

### Passo 2: Verificar Container vLLM

1. **Conecte na VM:**
```bash
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a
```

2. **Verifique se container está rodando:**
```bash
docker ps | grep vllm
```

**Deve mostrar algo como:**
```
CONTAINER ID   IMAGE                    STATUS         PORTS                    NAMES
abc123def456   vllm/vllm-openai:latest Up 2 hours    0.0.0.0:8000->8000/tcp   vllm-chat
```

**Se não estiver rodando:**
```bash
# Ver containers parados
docker ps -a | grep vllm

# Iniciar container
docker start vllm-chat

# Ou se o nome for diferente
docker start <container_id>
```

3. **Verificar logs do container:**
```bash
docker logs vllm-chat --tail 50
```

**Procure por:**
- ✅ "Uvicorn running on" → Container está OK
- ❌ Erros de GPU → Problema com drivers
- ❌ Erros de memória → Problema de recursos

---

### Passo 3: Testar Health Check

**Da VM:**
```bash
curl http://localhost:8000/health
```

**Deve retornar:**
```json
{"status": "ok"}
```

**Se não responder:**
- Container pode estar inicializando (aguarde 1-2 minutos)
- Container pode estar com problema

---

### Passo 4: Verificar IP no Supabase

1. **Acesse:** https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx
2. **Vá em:** **Settings** > **Edge Functions** > **Secrets**
3. **Verifique:**
   - `AI_CHAT_BASE_URL` deve ser: `http://34.71.221.107:8000`
   - OU `AI_BASE_URL` deve ser: `http://34.71.221.107:8000`

**Se IP estiver diferente:**
1. Verifique IP atual da VM no GCP
2. Atualize o secret no Supabase

---

### Passo 5: Verificar Logs do Supabase

1. **Acesse:** https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx
2. **Vá em:** **Edge Functions** > **ai-orchestrator** > **Logs**
3. **Procure por:**
   - `API timeout (60s)` → Timeout está ocorrendo
   - `API call timeout after 60s` → Confirma timeout
   - `Calling AI API: http://34.71.221.107:8000` → Verifica IP usado

**Se ver timeout:**
- VM pode estar lenta
- Container pode não estar respondendo
- Problema de conectividade

---

## 🚀 Solução Rápida

### Se VM Estiver Parada

```bash
# 1. Iniciar VM
gcloud compute instances start llm-chat-gpu-l4 --zone=us-central1-a

# 2. Aguardar 2-3 minutos para inicializar

# 3. Conectar e verificar
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a
docker ps | grep vllm

# 4. Se container não estiver rodando
docker start vllm-chat

# 5. Aguardar 1-2 minutos para vLLM inicializar

# 6. Testar
curl http://localhost:8000/health
```

---

### Se Container Não Estiver Rodando

```bash
# Conectar na VM
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a

# Verificar container
docker ps -a | grep vllm

# Iniciar container
docker start vllm-chat

# Verificar logs
docker logs vllm-chat --tail 50

# Aguardar inicialização (pode levar 1-2 minutos)
```

---

### Se IP Mudou (VM Preemptible)

1. **Verificar IP atual no GCP:**
   - Compute Engine > VM instances
   - Ver IP externo de `llm-chat-gpu-l4`

2. **Atualizar no Supabase:**
   - Settings > Edge Functions > Secrets
   - Atualizar `AI_CHAT_BASE_URL` ou `AI_BASE_URL`
   - Novo valor: `http://<NOVO_IP>:8000`

3. **Testar:**
   - Enviar mensagem no chat
   - Verificar se funciona

---

## 📊 Diagnóstico Detalhado

### Verificar Performance da VM

```bash
# Conectar na VM
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a

# Verificar GPU
nvidia-smi

# Deve mostrar:
# - GPU em uso
# - Memória sendo usada
# - Processo vLLM rodando

# Verificar CPU/RAM
htop
# ou
free -h
```

**Se GPU não estiver em uso:**
- Container pode não estar usando GPU
- Verificar logs do container

---

### Verificar Conectividade

**Da VM:**
```bash
# Testar se vLLM responde localmente
curl http://localhost:8000/health

# Testar se porta está aberta
netstat -tuln | grep 8000
```

**Do Supabase (via logs):**
- Verificar se há erros de conexão
- Verificar se IP está correto
- Verificar se timeout está ocorrendo

---

## ⚠️ Problemas Comuns

### 1. VM Preemptible Interrompida

**Sintoma:** VM está STOPPED

**Solução:**
- Iniciar VM
- Verificar se IP mudou
- Atualizar IP no Supabase se necessário

---

### 2. Container Não Inicializou

**Sintoma:** Container não está rodando

**Solução:**
```bash
docker start vllm-chat
# Aguardar 1-2 minutos
docker logs vllm-chat --tail 50
```

---

### 3. vLLM Ainda Carregando Modelo

**Sintoma:** Container rodando mas não responde

**Solução:**
- Aguardar 2-3 minutos após iniciar container
- Verificar logs: `docker logs vllm-chat --tail 50`
- Procurar por "Uvicorn running on"

---

### 4. IP Mudou

**Sintoma:** Timeout mesmo com VM rodando

**Solução:**
- Verificar IP atual no GCP
- Atualizar secret no Supabase
- Testar novamente

---

## 🔧 Melhorias Propostas

### 1. Aumentar Timeout (Temporário)

**Arquivo:** `supabase/functions/ai-orchestrator/index.ts:6358`

**Mudança:**
```typescript
// Atual: 60s
}, 60000);

// Proposta: 90s (se necessário)
}, 90000);
```

**⚠️ Atenção:** Isso pode mascarar problemas. Melhor resolver a causa.

---

### 2. Adicionar Retry Automático

**Proposta:** Adicionar retry no frontend quando timeout ocorre

**Arquivo:** `src/hooks/useUnifiedAIChat.ts`

**Implementação:**
- Detectar mensagem de timeout
- Aguardar 3 segundos
- Tentar novamente automaticamente (1 vez)
- Mostrar "Tentando novamente..."

---

### 3. Melhorar Mensagem de Erro

**Arquivo:** `supabase/functions/ai-orchestrator/index.ts:6426`

**Mudança:**
```typescript
// Atual
const timeoutMsg = 'O serviço está demorando mais que o normal. Por favor, tente novamente.';

// Melhorado
const timeoutMsg = 'O serviço está demorando mais que o normal. Isso pode acontecer quando há muitos usuários simultâneos ou quando o servidor está reiniciando. Por favor, tente novamente em alguns instantes.';
```

---

## 📋 Checklist de Verificação

Execute este checklist na ordem:

- [ ] VM está RUNNING no GCP?
- [ ] Container vLLM está rodando (`docker ps`)?
- [ ] Health check responde (`curl http://localhost:8000/health`)?
- [ ] IP externo está correto no Supabase?
- [ ] Logs do Supabase mostram timeout?
- [ ] GPU está sendo usada (`nvidia-smi`)?
- [ ] Container tem logs de erro?

---

## 🆘 Se Nada Funcionar

1. **Reiniciar VM completamente:**
```bash
gcloud compute instances stop llm-chat-gpu-l4 --zone=us-central1-a
# Aguardar 30 segundos
gcloud compute instances start llm-chat-gpu-l4 --zone=us-central1-a
# Aguardar 3-4 minutos
```

2. **Reiniciar container:**
```bash
docker restart vllm-chat
# Aguardar 2-3 minutos
```

3. **Verificar logs completos:**
```bash
docker logs vllm-chat
```

---

**Última atualização:** 2026-01-31
