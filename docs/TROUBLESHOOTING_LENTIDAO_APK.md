# Troubleshooting: Lentidão no APK

**Data:** 2026-01-31  
**Problema:** APK está muito lento, mostrando mensagem "O serviço está demorando mais que o normal"

---

## 🔍 Diagnóstico

### Mensagem de Erro

A mensagem **"O serviço está demorando mais que o normal. Por favor, tente novamente."** aparece quando:
- O timeout de 60 segundos é atingido na chamada à API do vLLM
- A VM do vLLM não responde a tempo
- Há problemas de conectividade

**Localização:** `supabase/functions/ai-orchestrator/index.ts:6426`

---

## 🔧 Possíveis Causas

### 1. VM do vLLM Desligada ou Lenta ⚠️ **MAIS PROVÁVEL**

**Sintomas:**
- Timeout após 60 segundos
- Mensagem "O serviço está demorando mais que o normal"
- Respostas muito lentas ou inexistentes

**Verificação:**
1. Acesse o GCP Console
2. Vá em **Compute Engine** > **VM instances**
3. Verifique se `llm-chat-gpu-l4` está **RUNNING**
4. Verifique se o container vLLM está rodando

**Solução:**
```bash
# Conectar na VM
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a

# Verificar se container está rodando
docker ps | grep vllm

# Se não estiver, iniciar
docker start <container_id>
# ou
docker-compose up -d
```

---

### 2. VM Preemptible Interrompida

**Sintomas:**
- VM pode ter sido interrompida (preemptible)
- Container não está rodando

**Verificação:**
1. Verificar status da VM no GCP
2. Verificar logs do container
3. Verificar se IP externo mudou

**Solução:**
1. Reiniciar VM se necessário
2. Reiniciar container vLLM
3. Atualizar IP no Supabase (se mudou)

---

### 3. Problemas de Conectividade

**Sintomas:**
- Timeout mesmo com VM rodando
- Latência alta entre Supabase e VM

**Verificação:**
1. Testar conectividade da VM:
```bash
# Da VM, testar se vLLM responde
curl http://localhost:8000/health
```

2. Testar do Supabase para VM:
```bash
# Verificar IP configurado
echo $AI_CHAT_BASE_URL
# Deve ser: http://34.71.221.107:8000
```

**Solução:**
- Verificar firewall rules no GCP
- Verificar se IP externo está correto
- Verificar se porta 8000 está aberta

---

### 4. Carga Alta na VM

**Sintomas:**
- Respostas lentas mas não timeout
- Múltiplos usuários simultâneos

**Verificação:**
1. Verificar uso de GPU:
```bash
nvidia-smi
```

2. Verificar uso de CPU/RAM:
```bash
htop
```

**Solução:**
- Aumentar recursos da VM (se necessário)
- Otimizar modelo ou reduzir carga

---

### 5. Timeout Muito Baixo

**Sintomas:**
- Timeout ocorre mesmo com VM funcionando
- Respostas demoram mais que 60s

**Status Atual:**
- Timeout: **60 segundos** (60000ms)
- Localização: `supabase/functions/ai-orchestrator/index.ts:6355`

**Solução:**
- Aumentar timeout para 90-120 segundos (se necessário)
- Otimizar modelo para respostas mais rápidas

---

## ✅ Soluções Imediatas

### Passo 1: Verificar Status da VM

1. **Acesse GCP Console:**
   - https://console.cloud.google.com/compute/instances
   - Procure por `llm-chat-gpu-l4`

2. **Verifique:**
   - Status: Deve estar **RUNNING**
   - IP Externo: Deve ser `34.71.221.107`
   - Última atividade: Deve ser recente

3. **Se estiver STOPPED:**
   - Clique em **START**
   - Aguarde 2-3 minutos para inicializar

---

### Passo 2: Verificar Container vLLM

1. **Conecte na VM:**
```bash
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a
```

2. **Verifique container:**
```bash
docker ps | grep vllm
```

3. **Se não estiver rodando:**
```bash
# Ver containers parados
docker ps -a | grep vllm

# Iniciar container
docker start <container_id>

# Ou se usar docker-compose
cd /path/to/vllm
docker-compose up -d
```

4. **Verificar logs:**
```bash
docker logs <container_id> --tail 50
```

---

### Passo 3: Verificar Conectividade

1. **Testar health check:**
```bash
# Da VM
curl http://localhost:8000/health

# Deve retornar algo como: {"status": "ok"}
```

2. **Testar do Supabase:**
   - Verificar variável `AI_CHAT_BASE_URL` no Supabase
   - Deve ser: `http://34.71.221.107:8000`

3. **Verificar firewall:**
   - GCP Console > **VPC network** > **Firewall rules**
   - Deve permitir tráfego na porta 8000

---

### Passo 4: Verificar Logs do Supabase

1. **Acesse Supabase Dashboard:**
   - Edge Functions > **ai-orchestrator** > **Logs**

2. **Procure por:**
   - `API timeout (60s)`
   - `API call timeout after 60s`
   - Erros de conexão
   - IP da VM nos logs

3. **Verifique:**
   - Se timeout está ocorrendo
   - Se há erros de conexão
   - Tempo de resposta antes do timeout

---

## 🔧 Melhorias Propostas

### 1. Aumentar Timeout (Se Necessário)

**Arquivo:** `supabase/functions/ai-orchestrator/index.ts`

**Mudança:**
```typescript
// Atual: 60s
}, 60000);

// Proposta: 90s (se necessário)
}, 90000);
```

**⚠️ Atenção:** Aumentar timeout pode mascarar problemas. Melhor resolver a causa raiz.

---

### 2. Melhorar Mensagem de Erro

**Arquivo:** `supabase/functions/ai-orchestrator/index.ts:6426`

**Mudança:**
```typescript
// Atual
const timeoutMsg = 'O serviço está demorando mais que o normal. Por favor, tente novamente.';

// Melhorado (mais informativo)
const timeoutMsg = 'O serviço está demorando mais que o normal. Isso pode acontecer quando há muitos usuários simultâneos. Por favor, tente novamente em alguns instantes.';
```

---

### 3. Adicionar Retry Automático

**Proposta:** Adicionar retry automático no frontend quando timeout ocorre

**Arquivo:** `src/hooks/useUnifiedAIChat.ts`

**Implementação:**
- Detectar timeout (mensagem específica)
- Aguardar 2-3 segundos
- Tentar novamente automaticamente (1 vez)
- Mostrar mensagem de "Tentando novamente..."

---

### 4. Monitoramento de Performance

**Proposta:** Adicionar métricas de performance

- Tempo médio de resposta
- Taxa de timeout
- Status da VM
- Alertas quando performance degrada

---

## 📊 Checklist de Diagnóstico

- [ ] VM está RUNNING no GCP?
- [ ] Container vLLM está rodando?
- [ ] Health check responde (`/health`)?
- [ ] IP externo está correto no Supabase?
- [ ] Firewall permite porta 8000?
- [ ] Logs do Supabase mostram timeout?
- [ ] Logs da VM mostram erros?
- [ ] GPU está sendo usada (`nvidia-smi`)?
- [ ] Há múltiplos usuários simultâneos?

---

## 🚀 Solução Rápida (Se VM Estiver Parada)

```bash
# 1. Iniciar VM
gcloud compute instances start llm-chat-gpu-l4 --zone=us-central1-a

# 2. Aguardar 2-3 minutos

# 3. Conectar e verificar container
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a
docker ps | grep vllm

# 4. Se container não estiver rodando, iniciar
docker start <container_id>
```

---

## 📝 Logs para Verificar

### Supabase Logs

Procure por:
```
[ai-orchestrator] API timeout (60s)
[ai-orchestrator] API call timeout after 60s
[ai-orchestrator] Request completed in ... ms (timeout)
```

### VM Logs

```bash
# Logs do container vLLM
docker logs <container_id> --tail 100

# Verificar se há erros
docker logs <container_id> 2>&1 | grep -i error
```

---

## ⚠️ Observações Importantes

1. **VM Preemptible:** A VM é preemptible, pode ser interrompida a qualquer momento
2. **IP Pode Mudar:** Se VM for recriada, IP externo pode mudar
3. **Timeout de 60s:** Configurado para evitar esperas muito longas
4. **Múltiplos Usuários:** Carga alta pode causar lentidão

---

## 🔄 Próximos Passos

1. **Imediato:**
   - Verificar status da VM
   - Verificar container vLLM
   - Verificar conectividade

2. **Curto Prazo:**
   - Implementar retry automático
   - Melhorar mensagens de erro
   - Adicionar monitoramento

3. **Longo Prazo:**
   - Considerar VM não-preemptible (mais estável)
   - Implementar health checks automáticos
   - Adicionar alertas de performance

---

**Última atualização:** 2026-01-31
