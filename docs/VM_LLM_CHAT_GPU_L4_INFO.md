# VM llm-chat-gpu-l4 (L4 24GB)

**Data de criação:** 2026-01-29  
**Status:** ✅ Configurada e funcionando
**Driver NVIDIA:** 570.211.01 (compatível com vLLM)
**Container vLLM:** ✅ Rodando

---

## 📋 Informações da VM

| Propriedade | Valor |
|-------------|-------|
| **Nome** | `llm-chat-gpu-l4` |
| **Zona** | `us-central1-a` |
| **Machine Type** | `g2-standard-8` |
| **GPU** | NVIDIA L4 (24GB VRAM) |
| **IP Interno** | `10.128.0.3` |
| **IP Externo** | `34.71.221.107` |
| **Preemptible** | ✅ Sim (economia de 60-80%) |
| **Status** | ✅ RUNNING |

---

## ⚠️ Observação Importante: LGPD

**A VM está em `us-central1-a` (EUA), não no Brasil.**

Isso significa:
- ⚠️ Dados não ficam no Brasil (LGPD)
- ✅ Melhor disponibilidade de GPU
- ✅ Custo similar

**Alternativa para LGPD:**
- Aguardar disponibilidade de L4 em `southamerica-east1`
- OU usar T4 em `southamerica-east1` com modelo quantizado

---

## 🚀 Próximos Passos

### 1. Conectar na VM

```bash
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a
```

### 2. Instalar Docker e NVIDIA Drivers

**✅ JÁ CONCLUÍDO**

- Docker instalado e funcionando
- Driver NVIDIA 570.211.01 instalado (compatível com vLLM)
- NVIDIA Container Toolkit instalado

### 3. Verificar GPU

```bash
nvidia-smi
```

**Status atual:**
```
NVIDIA L4 | 24GB VRAM | Driver 570.211.01 | CUDA 12.8
```

### 4. Deploy Llama 3.1 8B

**✅ JÁ CONCLUÍDO - Container rodando**

O container está configurado com:

```bash
HF_TOKEN="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"

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

**Configuração atual (sem tool calling):**
- ✅ `--shm-size=16g` (aumentado de 8g)
- ✅ `--max-model-len 24576` (24K tokens - ajustado para caber na memória)
- ✅ **Sem** `--quantization awq` (não precisa, cabe sem quantização)
- ✅ Driver NVIDIA 570 (compatível com vLLM)

**🛠 Reativar Tool Calling (Llama 3.1):** Para a LLM chamar ferramentas (find_nearby_services, validate_cep, etc.) e retornar endereços sempre do banco, suba o vLLM **na VM** (não no seu PC):

1. **Conecte na VM** (onde está a GPU e o Docker):
   ```bash
   gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a
   ```
2. **Na VM**, pare o container atual e suba com tool calling. Use **uma das formas abaixo**.

**Opção A – Comandos para colar na VM (copie só as linhas abaixo, sem \`\`\`bash):**

Rode um comando de cada vez:

```bash
docker stop vllm-chat
docker rm vllm-chat
```

```bash
export HF_TOKEN="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"
```

```bash
docker run -d --name vllm-chat --gpus all -p 8000:8000 -v ~/.cache/huggingface:/root/.cache/huggingface --restart unless-stopped --shm-size=16g -e HF_TOKEN="$HF_TOKEN" vllm/vllm-openai:latest meta-llama/Meta-Llama-3.1-8B-Instruct --host 0.0.0.0 --port 8000 --tensor-parallel-size 1 --max-model-len 24576 --gpu-memory-utilization 0.9 --enable-auto-tool-choice --tool-call-parser llama3_json --chat-template examples/tool_chat_template_llama3.1_json.jinja
```

Se o container morrer com erro no `--chat-template`, remova essa parte e rode de novo (sem `--chat-template examples/...`). Confira com `docker ps` e `docker logs vllm-chat --tail 30`.

**Opção B – Várias linhas (só funciona em bash, ex.: terminal na VM após SSH):**
```bash
docker stop vllm-chat
docker rm vllm-chat
HF_TOKEN="hf_..."
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
  --gpu-memory-utilization 0.9 \
  --enable-auto-tool-choice \
  --tool-call-parser llama3_json \
  --chat-template examples/tool_chat_template_llama3.1_json.jinja
```

**⚠️ Não rode esse `docker run` no Windows/PowerShell do seu PC:** o container precisa de GPU (NVIDIA) e da API do Docker; isso existe na VM no GCP. No PC você só precisa do `gcloud` para fazer SSH. Se no seu PC aparecer "failed to connect to the docker API", é esperado: o Docker desse comando deve rodar **dentro da VM**.

O ai-orchestrator já envia `tools` e `tool_choice: 'auto'` no request. Se o template não for encontrado no container, verifique o caminho em [vLLM Tool Calling](https://docs.vllm.ai/en/stable/features/tool_calling.html) (Llama Models).

**⚠️ Nota importante:** O `max-model-len` foi reduzido para 24576 tokens devido à limitação de memória KV cache. Para usar 128K tokens, seria necessário mais memória GPU ou quantização.

### 5. Configurar Firewall

**✅ JÁ CONCLUÍDO**

Firewall configurado:
- **Regra:** `allow-vllm-l4-8000`
- **Porta:** 8000 (TCP)
- **Source:** 0.0.0.0/0 (todas as origens)
- **Tag:** `llm-chat-gpu-l4`

A VM já possui a tag `llm-chat-gpu-l4` configurada.

### 7. Atualizar no Supabase

Após o container iniciar com sucesso:

- **AI_CHAT_BASE_URL**: `http://34.71.221.107:8000/v1`
- **AI_CHAT_MODEL**: `meta-llama/Meta-Llama-3.1-8B-Instruct`

---

## 💰 Custo Estimado

| Componente | Custo Mensal |
|------------|--------------|
| **VM g2-standard-8 + L4 (preemptible)** | ~R$ 1.200-1.500 |
| **Storage 200GB SSD** | ~R$ 50 |
| **Network (tráfego)** | ~R$ 100-200 |
| **TOTAL** | **~R$ 1.350-1.750/mês** |

---

## 📊 Performance Esperada

| Métrica | Valor Esperado |
|---------|----------------|
| **Latência p50** | 1-2s |
| **Latência p95** | 2-4s |
| **Throughput** | 100-200 req/s |
| **Acessos simultâneos** | 200-500 |
| **Contexto máximo** | 24576 tokens (24K) - ajustado para memória disponível |

---

## 🔧 Comandos Úteis

### Verificar status da VM

```bash
gcloud compute instances describe llm-chat-gpu-l4 \
  --zone=us-central1-a \
  --format="get(status,networkInterfaces[0].accessConfigs[0].natIP)"
```

### Parar VM (economizar custos)

```bash
gcloud compute instances stop llm-chat-gpu-l4 --zone=us-central1-a
```

### Iniciar VM

```bash
gcloud compute instances start llm-chat-gpu-l4 --zone=us-central1-a
```

### Ver logs do container

```bash
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a --command="docker logs -f vllm-chat"
```

### Testar API

```bash
curl -X POST http://34.71.221.107:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Meta-Llama-3.1-8B-Instruct",
    "messages": [{"role": "user", "content": "Olá, como você está?"}],
    "max_tokens": 100
  }'
```

---

## 📝 Checklist de Configuração

- [x] VM criada com L4 24GB
- [x] Docker instalado e configurado
- [x] Driver NVIDIA 570 instalado (compatível com vLLM)
- [x] NVIDIA Container Toolkit instalado
- [x] GPU verificada com `nvidia-smi`
- [x] Deploy vLLM com Llama 3.1 8B
- [x] Container rodando e API funcionando
- [x] Firewall configurado (porta 8000)
- [x] Tag adicionada à VM
- [ ] Atualizar Supabase secrets
- [ ] Testar integração completa

---

## ✅ Status Atual

**Container vLLM:** ✅ Rodando  
**API Endpoint:** `http://34.71.221.107:8000/v1`  
**Modelo:** `meta-llama/Meta-Llama-3.1-8B-Instruct`  
**Max Model Len:** 24576 tokens (24K)  
**Driver NVIDIA:** 570.211.01  
**GPU:** NVIDIA L4 (24GB VRAM)

---

**Última atualização:** 2026-01-29  
**Status:** ✅ Configurado e funcionando
