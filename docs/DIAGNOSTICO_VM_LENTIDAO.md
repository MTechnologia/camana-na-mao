# Diagnóstico: VM Rodando mas Lenta

**Data:** 2026-01-31  
**Status:** Container vLLM está rodando (Up 30 minutes)  
**Problema:** APK ainda está lento

---

## ✅ Status Atual

```
Container: vllm-chat
Status: Up 30 minutes
Porta: 8000 (exposta)
```

**Container está rodando, mas pode estar lento por outros motivos.**

---

## 🔍 Diagnóstico Passo a Passo

### Passo 1: Verificar Health Check

```bash
curl http://localhost:8000/health
```

**Esperado:**
```json
{"status": "ok"}
```

**Se não responder ou demorar:**
- Container pode estar inicializando ainda
- Pode haver problema interno

---

### Passo 2: Verificar Logs do Container

```bash
docker logs vllm-chat --tail 50
```

**Procure por:**
- ✅ `Uvicorn running on` → Container OK
- ✅ `Model loaded` → Modelo carregado
- ❌ Erros de GPU → Problema com drivers
- ❌ Erros de memória → Falta de recursos
- ❌ Timeouts → Problema de performance

**Comando completo:**
```bash
docker logs vllm-chat --tail 100 | grep -i "error\|warn\|timeout\|uvicorn"
```

---

### Passo 3: Verificar Uso de GPU

```bash
nvidia-smi
```

**Verifique:**
- ✅ GPU está sendo usada (utilização > 0%)
- ✅ Memória GPU está sendo usada
- ✅ Processo `vllm` está rodando
- ❌ GPU em 0% → Container não está usando GPU

**Se GPU não estiver sendo usada:**
```bash
# Verificar se container tem acesso à GPU
docker inspect vllm-chat | grep -i gpu

# Deve mostrar algo como:
# "DeviceRequests": [{"Driver": "nvidia", ...}]
```

---

### Passo 4: Testar Resposta da API

```bash
# Testar endpoint de chat
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Meta-Llama-3.1-8B-Instruct",
    "messages": [{"role": "user", "content": "Olá"}],
    "max_tokens": 50
  }'
```

**Medir tempo de resposta:**
```bash
time curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Meta-Llama-3.1-8B-Instruct",
    "messages": [{"role": "user", "content": "Olá"}],
    "max_tokens": 50
  }'
```

**Esperado:**
- Tempo < 5 segundos para resposta simples
- Se > 10 segundos → Problema de performance

---

### Passo 5: Verificar Recursos da VM

```bash
# CPU e RAM
htop
# ou
free -h
top
```

**Verifique:**
- ✅ CPU não está em 100%
- ✅ RAM disponível (não está esgotada)
- ✅ Swap não está sendo usado excessivamente

---

### Passo 6: Verificar Conectividade do Supabase

**No Supabase Dashboard:**
1. Edge Functions > **ai-orchestrator** > **Logs**
2. Procure por:
   - `Calling AI API: http://34.71.221.107:8000`
   - `API timeout (60s)`
   - Erros de conexão

**Se ver timeout:**
- Problema de conectividade entre Supabase e VM
- Ou VM está muito lenta para responder

---

## 🔧 Soluções Comuns

### Problema 1: Container Lento (GPU não sendo usada)

**Sintoma:** Container roda mas respostas são lentas

**Solução:**
```bash
# Verificar se container tem acesso à GPU
docker inspect vllm-chat | grep -i gpu

# Se não tiver, recriar container com GPU:
docker stop vllm-chat
docker rm vllm-chat

# Recriar com GPU (usar comando original de criação)
docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  --shm-size=16g \
  -e HF_TOKEN="$HF_TOKEN" \
  vllm/vllm-openai:latest \
  meta-llama/Meta-Llama-3.1-8B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --max-model-len 24576 \
  --gpu-memory-utilization 0.9
```

---

### Problema 2: Modelo Ainda Carregando

**Sintoma:** Container rodando mas não responde

**Verificação:**
```bash
docker logs vllm-chat --tail 20
```

**Procure por:**
- `Loading model...` → Ainda carregando
- `Model loaded` → Carregado
- `Uvicorn running on` → Pronto

**Solução:**
- Aguardar mais alguns minutos
- Verificar logs para progresso

---

### Problema 3: Múltiplas Requisições Simultâneas

**Sintoma:** Lento quando há muitos usuários

**Verificação:**
```bash
# Ver requisições ativas
docker logs vllm-chat --tail 100 | grep -i "request\|POST"
```

**Solução:**
- Considerar aumentar recursos da VM
- Ou limitar requisições simultâneas

---

### Problema 4: Problema de Conectividade

**Sintoma:** Timeout mesmo com container rodando

**Verificação:**
```bash
# Da VM, testar localmente
curl http://localhost:8000/health

# Do Supabase, verificar logs
# Edge Functions > ai-orchestrator > Logs
```

**Solução:**
- Verificar firewall rules no GCP
- Verificar se IP está correto no Supabase
- Verificar se porta 8000 está aberta

---

## 📊 Checklist de Diagnóstico

Execute na ordem:

- [ ] Health check responde (`curl http://localhost:8000/health`)
- [ ] Logs não mostram erros (`docker logs vllm-chat --tail 50`)
- [ ] GPU está sendo usada (`nvidia-smi`)
- [ ] API responde em < 5s (teste com curl)
- [ ] CPU/RAM não estão esgotados (`htop`)
- [ ] IP está correto no Supabase
- [ ] Logs do Supabase não mostram erros de conexão

---

## 🚀 Próximos Passos

### Se Container Está Lento:

1. **Verificar GPU:**
```bash
nvidia-smi
```

2. **Verificar Logs:**
```bash
docker logs vllm-chat --tail 100
```

3. **Testar API:**
```bash
time curl -X POST http://localhost:8000/v1/chat/completions ...
```

4. **Se necessário, reiniciar container:**
```bash
docker restart vllm-chat
# Aguardar 2-3 minutos
```

---

### Se Conectividade Está com Problema:

1. **Verificar IP no Supabase:**
   - Settings > Edge Functions > Secrets
   - `AI_CHAT_BASE_URL` deve ser: `http://34.71.221.107:8000`

2. **Verificar Firewall:**
   - GCP Console > VPC network > Firewall rules
   - Deve permitir porta 8000

3. **Testar do Supabase:**
   - Ver logs da Edge Function
   - Verificar se há erros de conexão

---

## 📝 Comandos Úteis

```bash
# Ver status completo do container
docker ps -a | grep vllm

# Ver logs em tempo real
docker logs -f vllm-chat

# Ver uso de recursos
docker stats vllm-chat

# Reiniciar container
docker restart vllm-chat

# Ver configuração do container
docker inspect vllm-chat
```

---

**Última atualização:** 2026-01-31
