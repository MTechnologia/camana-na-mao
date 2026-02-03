# Arquitetura para Testes Locais
## Orçamento: R$ 500-2000/mês | 200+ Requests Simultâneos

**Data:** 2026-01-28  
**Objetivo:** Configuração otimizada para testes robustos, carga e stress

---

## 🎯 Resposta Direta

### **Recomendação: T4 16GB + Llama 3.1 8B + n8n Cloud Run** ⭐⭐⭐⭐⭐

**Custo Total:** R$ 1.200-1.800/mês  
**Capacidade:** 200+ requests simultâneos  
**Qualidade:** ⭐⭐⭐⭐ Muito Boa

---

## 📊 Opções de Arquitetura por Orçamento

### Opção 1: Orçamento Mínimo (R$ 500-800/mês) ⭐⭐⭐

| Componente | Especificação | Custo Mensal |
|------------|---------------|--------------|
| **VM Chat (T4)** | n1-standard-4 + T4 (preemptible) | R$ 1.200 |
| **Modelo** | Qwen 2.5 3B-Instruct (quantizado) | R$ 0 |
| **n8n Cloud Run** | 2-10 instâncias (teste) | R$ 300-500 |
| **Storage/Network** | 100GB SSD | R$ 100 |
| **TOTAL** | | **R$ 1.600-1.800/mês** |

**⚠️ Limitação:** Orçamento mínimo ainda fica acima de R$ 1.500/mês com GPU.

**Alternativa sem GPU (CPU only):**
- VM CPU: e2-standard-4 (R$ 200/mês)
- Modelo: Phi-3 Mini (3.8B, roda em CPU)
- n8n Cloud Run: R$ 300-500/mês
- **TOTAL: R$ 500-700/mês** ⚠️ Performance limitada

---

### Opção 2: Orçamento Recomendado (R$ 1.200-1.800/mês) ⭐⭐⭐⭐⭐

| Componente | Especificação | Custo Mensal |
|------------|---------------|--------------|
| **VM Chat (T4)** | n1-standard-4 + T4 (preemptible) | R$ 1.200 |
| **Modelo** | Llama 3.1 8B-Instruct (quantizado AWQ) | R$ 0 |
| **n8n Cloud Run** | 5-20 instâncias (teste robusto) | R$ 500-800 |
| **Storage/Network** | 200GB SSD + tráfego | R$ 200 |
| **TOTAL** | | **R$ 1.900-2.200/mês** |

**Ajuste para R$ 1.800:**
- Reduzir instâncias n8n: 3-10 instâncias (R$ 300-600)
- **TOTAL: R$ 1.700-2.000/mês** ✅

**Capacidade:**
- ✅ 200+ requests simultâneos
- ✅ Testes de carga robustos
- ✅ Testes de stress
- ✅ Qualidade muito boa

---

### Opção 3: Orçamento Esticado (R$ 1.800-2.000/mês) ⭐⭐⭐⭐

| Componente | Especificação | Custo Mensal |
|------------|---------------|--------------|
| **VM Chat (T4)** | n1-standard-8 + T4 (preemptible) | R$ 1.400 |
| **Modelo** | Qwen 2.5 7B-Instruct (quantizado) | R$ 0 |
| **n8n Cloud Run** | 10-30 instâncias | R$ 600-800 |
| **Storage/Network** | 200GB SSD + tráfego | R$ 200 |
| **TOTAL** | | **R$ 2.200-2.400/mês** |

**Ajuste para R$ 2.000:**
- Reduzir instâncias n8n: 5-15 instâncias (R$ 400-600)
- **TOTAL: R$ 2.000-2.200/mês** ✅

---

## 🏆 Modelos Recomendados para Testes

### Modelo 1: Llama 3.1 8B-Instruct (Recomendado) ⭐⭐⭐⭐⭐

| Aspecto | Especificação |
|---------|---------------|
| **Parâmetros** | 8B |
| **Memória (quantizado)** | ~12GB (AWQ) |
| **Cabe em T4?** | ✅ Sim (perfeitamente) |
| **Qualidade** | ⭐⭐⭐⭐ Muito Boa |
| **Contexto** | 128K tokens |
| **Latência** | 1-3s |
| **Throughput** | 50-100 req/s |
| **Custo** | R$ 0 (open-source) |

**Vantagens:**
- ✅ Melhor contexto (128K tokens)
- ✅ Cabe perfeitamente em T4
- ✅ Qualidade suficiente para testes
- ✅ Suporte a tool calling

**Deploy:**
```bash
docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  vllm/vllm-openai:latest \
  meta-llama/Meta-Llama-3.1-8B-Instruct-AWQ \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --max-model-len 131072 \
  --gpu-memory-utilization 0.9 \
  --enable-auto-tool-choice \
  --tool-call-parser openai \
  --quantization awq
```

---

### Modelo 2: Qwen 2.5 7B-Instruct ⭐⭐⭐⭐

| Aspecto | Especificação |
|---------|---------------|
| **Parâmetros** | 7B |
| **Memória (quantizado)** | ~10GB (AWQ) |
| **Cabe em T4?** | ✅ Sim (com folga) |
| **Qualidade** | ⭐⭐⭐⭐ Muito Boa |
| **Contexto** | 32K tokens |
| **Latência** | 1-2s |
| **Throughput** | 60-120 req/s |
| **Custo** | R$ 0 (open-source) |

**Vantagens:**
- ✅ Mais rápido que Llama 8B
- ✅ Melhor suporte a português
- ✅ Cabe com folga em T4

**Desvantagens:**
- ⚠️ Contexto menor (32K vs 128K)

---

### Modelo 3: Qwen 2.5 3B-Instruct (Orçamento Apertado) ⭐⭐⭐

| Aspecto | Especificação |
|---------|---------------|
| **Parâmetros** | 3B |
| **Memória (quantizado)** | ~6GB (AWQ) |
| **Cabe em T4?** | ✅ Sim (muita folga) |
| **Qualidade** | ⭐⭐⭐ Boa |
| **Contexto** | 32K tokens |
| **Latência** | 0.5-1.5s |
| **Throughput** | 100-200 req/s |
| **Custo** | R$ 0 (open-source) |

**Vantagens:**
- ✅ Muito rápido
- ✅ Alto throughput
- ✅ Cabe com muita folga

**Desvantagens:**
- ⚠️ Qualidade inferior (3B parâmetros)
- ⚠️ Limitado para testes complexos

---

## 🏗️ Arquitetura Recomendada para Testes

### Arquitetura Completa (R$ 1.700-2.000/mês)

```
┌─────────────────────────────────────────────────┐
│           Frontend (React/Vite)                 │
│         (já existe, sem custo adicional)        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│        Supabase Edge Functions                  │
│      (ai-orchestrator, já existe)               │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         n8n Cloud Run (Self-hosted)             │
│  5-20 instâncias | Auto-scaling | R$ 500-800/mês│
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│      vLLM + Llama 3.1 8B (T4 16GB)              │
│  VM: n1-standard-4 | Preemptible | R$ 1.200/mês│
│  Throughput: 50-100 req/s | Latência: 1-3s      │
└─────────────────────────────────────────────────┘
```

**Componentes:**
1. **VM Chat (T4):** R$ 1.200/mês
2. **n8n Cloud Run:** R$ 500-800/mês (5-20 instâncias)
3. **Storage/Network:** R$ 200/mês
4. **TOTAL:** R$ 1.900-2.200/mês

**Ajuste para R$ 1.800:**
- Reduzir n8n: 3-10 instâncias (R$ 300-600)
- **TOTAL: R$ 1.700-2.000/mês** ✅

---

## 🧪 Configuração para Testes de Carga

### 1. Configuração n8n Cloud Run (Testes)

```yaml
# Configuração para testes robustos
service: n8n-worker-test
region: southamerica-east1
min-instances: 3
max-instances: 20
cpu: 2
memory: 4Gi
concurrency: 40
timeout: 300s
```

**Custo estimado:** R$ 300-600/mês (depende do uso)

### 2. Configuração VM T4 (Otimizada para Testes)

```bash
# VM para testes
gcloud compute instances create llm-chat-test \
  --zone=southamerica-east1-a \
  --machine-type=n1-standard-4 \
  --accelerator="type=nvidia-tesla-t4,count=1" \
  --preemptible \
  --boot-disk-size=200GB \
  --boot-disk-type=pd-ssd \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud
```

**Custo:** R$ 1.200/mês (preemptible)

### 3. Configuração vLLM (Otimizada para Throughput)

```bash
docker run -d \
  --name vllm-chat-test \
  --gpus all \
  -p 8000:8000 \
  --shm-size=8g \
  vllm/vllm-openai:latest \
  meta-llama/Meta-Llama-3.1-8B-Instruct-AWQ \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --max-model-len 131072 \
  --gpu-memory-utilization 0.95 \
  --max-num-seqs 256 \
  --enable-auto-tool-choice \
  --tool-call-parser openai \
  --quantization awq
```

**Parâmetros importantes:**
- `--max-num-seqs 256`: Permite mais requisições simultâneas
- `--gpu-memory-utilization 0.95`: Máximo uso de GPU
- `--max-model-len 131072`: Contexto completo (128K tokens)

---

## 📈 Capacidade de Testes

### Llama 3.1 8B (T4 16GB)

| Tipo de Teste | Capacidade | Observações |
|---------------|------------|-------------|
| **Requests simultâneos** | 200-300 | Com `--max-num-seqs 256` |
| **Throughput pico** | 50-100 req/s | Sustentável |
| **Latência p50** | 1-2s | Boa |
| **Latência p95** | 2-4s | Aceitável |
| **Latência p99** | 3-5s | Para testes |
| **Teste de stress** | ✅ Suporta | Até 300 req simultâneas |

### Qwen 2.5 7B (T4 16GB)

| Tipo de Teste | Capacidade | Observações |
|---------------|------------|-------------|
| **Requests simultâneos** | 250-350 | Mais rápido |
| **Throughput pico** | 60-120 req/s | Superior |
| **Latência p50** | 0.8-1.5s | Melhor |
| **Latência p95** | 1.5-3s | Melhor |
| **Teste de stress** | ✅ Suporta | Até 350 req simultâneas |

---

## 💰 Análise de Custos Detalada

### Cenário 1: Testes Básicos (R$ 1.700/mês)

| Componente | Custo Mensal | Uso |
|------------|--------------|-----|
| **VM T4 (preemptible)** | R$ 1.200 | 24/7 para testes |
| **n8n Cloud Run (3-5 inst)** | R$ 300 | Testes básicos |
| **Storage/Network** | R$ 200 | 200GB SSD |
| **TOTAL** | **R$ 1.700/mês** | |

**Capacidade:**
- 100-150 requests simultâneos
- Testes básicos de carga
- Testes funcionais

---

### Cenário 2: Testes Robustos (R$ 1.900/mês) ⭐ Recomendado

| Componente | Custo Mensal | Uso |
|------------|--------------|-----|
| **VM T4 (preemptible)** | R$ 1.200 | 24/7 para testes |
| **n8n Cloud Run (5-10 inst)** | R$ 500 | Testes robustos |
| **Storage/Network** | R$ 200 | 200GB SSD |
| **TOTAL** | **R$ 1.900/mês** | |

**Capacidade:**
- 200+ requests simultâneos
- Testes robustos de carga
- Testes de stress
- Testes de longa duração

---

### Cenário 3: Testes Intensivos (R$ 2.200/mês)

| Componente | Custo Mensal | Uso |
|------------|--------------|-----|
| **VM T4 (preemptible)** | R$ 1.200 | 24/7 para testes |
| **n8n Cloud Run (10-20 inst)** | R$ 800 | Testes intensivos |
| **Storage/Network** | R$ 200 | 200GB SSD |
| **TOTAL** | **R$ 2.200/mês** | |

**Capacidade:**
- 300+ requests simultâneos
- Testes intensivos de carga
- Testes de stress extremo
- Testes de longa duração (horas)

---

## 🎯 Recomendação Final para Testes

### **Arquitetura: T4 + Llama 3.1 8B + n8n Cloud Run** ⭐⭐⭐⭐⭐

**Custo:** R$ 1.700-2.000/mês  
**Capacidade:** 200+ requests simultâneos

**Componentes:**
1. ✅ **VM T4:** n1-standard-4 + T4 (preemptible) - R$ 1.200/mês
2. ✅ **Modelo:** Llama 3.1 8B-Instruct-AWQ - R$ 0
3. ✅ **n8n Cloud Run:** 5-10 instâncias - R$ 500/mês
4. ✅ **Storage/Network:** 200GB SSD - R$ 200/mês

**Vantagens:**
- ✅ Cabe no orçamento (R$ 1.900/mês)
- ✅ Suporta 200+ requests simultâneos
- ✅ Qualidade muito boa (8B parâmetros)
- ✅ Contexto longo (128K tokens)
- ✅ Preemptible = economia de 60-80%

---

## 🚀 Implementação Passo a Passo

### Passo 1: Criar VM T4 para Testes

```bash
# Definir variáveis
ZONE="southamerica-east1-a"
PROJECT_ID="arcane-atom-480020-f6"

# Criar VM T4 (preemptible para economia)
gcloud compute instances create llm-chat-test \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --machine-type=n1-standard-4 \
  --accelerator="type=nvidia-tesla-t4,count=1" \
  --preemptible \
  --maintenance-policy=TERMINATE \
  --restart-on-failure \
  --boot-disk-size=200GB \
  --boot-disk-type=pd-ssd \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=llm-chat-test
```

**Custo:** R$ 1.200/mês (preemptible = 60-80% mais barato)

### Passo 2: Instalar Docker e NVIDIA Drivers

```bash
# Conectar na VM
gcloud compute ssh llm-chat-test --zone=$ZONE

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Instalar NVIDIA Drivers
sudo ubuntu-drivers autoinstall
sudo reboot

# Após reiniciar, verificar
nvidia-smi
```

### Passo 3: Deploy Llama 3.1 8B (Otimizado para Testes)

```bash
# Deploy vLLM com configuração otimizada para throughput
docker run -d \
  --name vllm-chat-test \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  --shm-size=8g \
  vllm/vllm-openai:latest \
  meta-llama/Meta-Llama-3.1-8B-Instruct-AWQ \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --max-model-len 131072 \
  --gpu-memory-utilization 0.95 \
  --max-num-seqs 256 \
  --enable-auto-tool-choice \
  --tool-call-parser openai \
  --quantization awq

# Verificar logs
docker logs -f vllm-chat-test
```

**Parâmetros importantes para testes:**
- `--max-num-seqs 256`: Permite até 256 requisições simultâneas
- `--gpu-memory-utilization 0.95`: Máximo uso de GPU
- `--max-model-len 131072`: Contexto completo (128K tokens)

### Passo 4: Configurar Firewall

```bash
# Abrir porta 8000
gcloud compute firewall-rules create allow-vllm-test-8000 \
  --allow tcp:8000 \
  --source-ranges 0.0.0.0/0 \
  --target-tags llm-chat-test \
  --description "Allow vLLM on port 8000 (testes)"
```

### Passo 5: Configurar n8n Cloud Run (Testes)

```bash
# Deploy n8n com configuração para testes
gcloud run deploy n8n-worker-test \
  --image n8nio/n8n:latest \
  --region southamerica-east1 \
  --platform managed \
  --memory 4Gi \
  --cpu 2 \
  --min-instances 3 \
  --max-instances 20 \
  --concurrency 40 \
  --timeout 300 \
  --set-env-vars "N8N_BASIC_AUTH_ACTIVE=true,N8N_BASIC_AUTH_USER=admin,N8N_BASIC_AUTH_PASSWORD=$(openssl rand -hex 16)"
```

**Custo estimado:** R$ 500-800/mês (depende do uso)

### Passo 6: Configurar Supabase Secrets

```bash
# Secrets no Supabase para testes:
AI_CHAT_BASE_URL=http://$EXTERNAL_IP:8000/v1
AI_CHAT_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct-AWQ
AI_API_KEY=dummy
```

---

## 🧪 Scripts de Teste de Carga

### Script 1: Teste Básico (100 requests simultâneos)

```python
import asyncio
import aiohttp
import time

async def send_request(session, url, payload):
    async with session.post(url, json=payload) as response:
        return await response.json()

async def load_test(url, num_requests=100):
    payload = {
        "model": "meta-llama/Meta-Llama-3.1-8B-Instruct-AWQ",
        "messages": [{"role": "user", "content": "Olá, como você está?"}],
        "max_tokens": 100
    }
    
    async with aiohttp.ClientSession() as session:
        start = time.time()
        tasks = [send_request(session, url, payload) for _ in range(num_requests)]
        results = await asyncio.gather(*tasks)
        end = time.time()
        
        print(f"Total requests: {num_requests}")
        print(f"Total time: {end - start:.2f}s")
        print(f"Requests/sec: {num_requests / (end - start):.2f}")

# Executar
asyncio.run(load_test("http://SEU_IP:8000/v1/chat/completions", 100))
```

### Script 2: Teste de Stress (200+ requests simultâneos)

```python
import asyncio
import aiohttp
import time
from concurrent.futures import ThreadPoolExecutor

async def stress_test(url, num_requests=200, concurrent=50):
    payload = {
        "model": "meta-llama/Meta-Llama-3.1-8B-Instruct-AWQ",
        "messages": [{"role": "user", "content": "Teste de stress"}],
        "max_tokens": 50
    }
    
    semaphore = asyncio.Semaphore(concurrent)
    
    async def send_with_semaphore(session, url, payload):
        async with semaphore:
            async with session.post(url, json=payload) as response:
                return await response.json()
    
    async with aiohttp.ClientSession() as session:
        start = time.time()
        tasks = [send_with_semaphore(session, url, payload) for _ in range(num_requests)]
        results = await asyncio.gather(*tasks)
        end = time.time()
        
        print(f"Stress test: {num_requests} requests, {concurrent} concurrent")
        print(f"Total time: {end - start:.2f}s")
        print(f"Requests/sec: {num_requests / (end - start):.2f}")

# Executar
asyncio.run(stress_test("http://SEU_IP:8000/v1/chat/completions", 200, 50))
```

---

## 📊 Comparativo: Modelos para Testes

| Modelo | Parâmetros | Memória | Throughput | Latência | Custo | Score |
|--------|-----------|---------|------------|----------|-------|-------|
| **Llama 3.1 8B** | 8B | 12GB | 50-100 req/s | 1-3s | R$ 0 | **9.0/10** |
| **Qwen 2.5 7B** | 7B | 10GB | 60-120 req/s | 0.8-2s | R$ 0 | 8.5/10 |
| **Qwen 2.5 3B** | 3B | 6GB | 100-200 req/s | 0.5-1.5s | R$ 0 | 7.0/10 |

**Recomendação:** Llama 3.1 8B (melhor equilíbrio qualidade/performance)

---

## ✅ Checklist de Implementação

- [ ] Criar VM T4 (preemptible) - R$ 1.200/mês
- [ ] Instalar Docker e NVIDIA drivers
- [ ] Deploy Llama 3.1 8B (AWQ) com `--max-num-seqs 256`
- [ ] Configurar firewall (porta 8000)
- [ ] Deploy n8n Cloud Run (5-10 instâncias) - R$ 500/mês
- [ ] Configurar Supabase secrets
- [ ] Criar scripts de teste de carga
- [ ] Executar testes básicos (100 req simultâneas)
- [ ] Executar testes robustos (200 req simultâneas)
- [ ] Executar testes de stress (300+ req simultâneas)
- [ ] Monitorar latência e throughput
- [ ] Ajustar configurações conforme necessário

---

## 🎯 Resumo Executivo

### Arquitetura Recomendada

**Componentes:**
- **VM T4:** n1-standard-4 + T4 (preemptible) - R$ 1.200/mês
- **Modelo:** Llama 3.1 8B-Instruct-AWQ - R$ 0
- **n8n Cloud Run:** 5-10 instâncias - R$ 500/mês
- **Storage/Network:** 200GB SSD - R$ 200/mês

**Custo Total:** R$ 1.900/mês ✅  
**Capacidade:** 200+ requests simultâneos ✅  
**Qualidade:** ⭐⭐⭐⭐ Muito Boa ✅

### Vantagens

- ✅ Cabe no orçamento (R$ 1.700-2.000/mês)
- ✅ Suporta testes robustos (200+ req simultâneas)
- ✅ Qualidade excelente (8B parâmetros)
- ✅ Contexto longo (128K tokens)
- ✅ Preemptible = economia de 60-80%

---

**Última atualização:** 2026-01-28  
**Status:** Pronto para implementação
