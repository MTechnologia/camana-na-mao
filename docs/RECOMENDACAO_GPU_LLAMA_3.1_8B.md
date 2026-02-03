# Recomendação de GPU para Llama 3.1 8B

**Data:** 2026-01-29  
**Problema:** T4 16GB não suporta Llama 3.1 8B sem quantização

---

## 🔍 Análise do Problema

O modelo **Llama 3.1 8B** requer aproximadamente **16-18GB de VRAM** quando carregado sem quantização. A T4 16GB não tem memória suficiente porque:
- O modelo em si ocupa ~16GB
- O vLLM precisa de memória adicional para KV cache, buffers, etc.
- Com `--max-model-len 8192`, ainda precisa de ~2-3GB extras

---

## ✅ GPUs Recomendadas para Llama 3.1 8B

### Opção 1: NVIDIA L4 24GB (Recomendada para LGPD)

**Especificações:**
- **VRAM:** 24GB GDDR6
- **Performance:** Excelente para inferência
- **Custo:** ~R$ 1.200-1.500/mês (preemptible)
- **Disponibilidade:** Verificar `southamerica-east1` (LGPD)

**Vantagens:**
- ✅ **24GB** suficiente para Llama 3.1 8B sem quantização
- ✅ Suporta `--max-model-len 131072` (128K tokens)
- ✅ LGPD compliance se disponível em `southamerica-east1`
- ✅ Melhor custo-benefício para inferência

**Comando para criar VM:**
```bash
gcloud compute instances create llm-chat-gpu-l4 \
  --zone=southamerica-east1-a \
  --machine-type=n1-standard-8 \
  --accelerator="type=nvidia-l4,count=1" \
  --maintenance-policy=TERMINATE \
  --restart-on-failure \
  --boot-disk-size=200GB \
  --boot-disk-type=pd-ssd \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --preemptible
```

**⚠️ Verificar disponibilidade:**
```bash
gcloud compute accelerator-types list --filter="zone:southamerica-east1-a AND name:nvidia-l4"
```

### Opção 2: NVIDIA A100 40GB (Máxima Performance)

**Especificações:**
- **VRAM:** 40GB HBM2
- **Performance:** Máxima para LLMs
- **Custo:** ~R$ 3.500-4.500/mês (preemptible)
- **Disponibilidade:** Verificar `southamerica-east1` ou `us-central1`

**Vantagens:**
- ✅ **40GB** permite modelos maiores (Llama 3.1 70B, Qwen 2.5 32B)
- ✅ Suporta múltiplos modelos simultâneos
- ✅ Melhor throughput para testes robustos (200+ simultâneos)
- ✅ Suporta `--max-model-len 131072` com folga

**Comando para criar VM:**
```bash
gcloud compute instances create llm-chat-gpu-a100 \
  --zone=us-central1-a \
  --machine-type=a2-highgpu-1g \
  --maintenance-policy=TERMINATE \
  --restart-on-failure \
  --boot-disk-size=200GB \
  --boot-disk-type=pd-ssd \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --preemptible
```

**⚠️ Nota:** A100 geralmente não está disponível em `southamerica-east1` (LGPD).

### Opção 3: NVIDIA L40S 48GB (Alternativa Premium)

**Especificações:**
- **VRAM:** 48GB GDDR6
- **Performance:** Excelente para inferência e treinamento
- **Custo:** ~R$ 2.500-3.000/mês (preemptible)
- **Disponibilidade:** Verificar `southamerica-east1` ou `us-central1`

**Vantagens:**
- ✅ **48GB** permite modelos muito grandes
- ✅ Melhor que A100 para inferência pura
- ✅ Suporta múltiplos modelos simultâneos

---

## 🚀 Recomendação Final

### Para Testes Robustos (200+ Simultâneos) + LGPD:

**NVIDIA L4 24GB** em `southamerica-east1` (se disponível)

**Se L4 não estiver disponível em `southamerica-east1`:**
- **Opção A:** Usar L4 em `us-central1` (aceitar que dados saem do Brasil)
- **Opção B:** Usar A100 em `us-central1` (melhor performance, mas mais caro)

### Para Máxima Performance (Sem Restrição LGPD):

**NVIDIA A100 40GB** em `us-central1`

---

## 📊 Comparação de GPUs

| GPU | VRAM | Custo/mês | Llama 3.1 8B | Throughput | LGPD (BR) |
|-----|------|-----------|--------------|------------|-----------|
| **T4** | 16GB | ~R$ 400 | ❌ Não cabe | Baixo | ✅ Sim |
| **L4** | 24GB | ~R$ 1.200 | ✅ Cabe | Alto | ⚠️ Verificar |
| **A100** | 40GB | ~R$ 3.500 | ✅ Cabe | Muito Alto | ❌ Não |
| **L40S** | 48GB | ~R$ 2.500 | ✅ Cabe | Muito Alto | ⚠️ Verificar |

---

## 🔧 Comando Docker para L4/A100

Após criar a VM com L4 ou A100, use:

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
  --max-model-len 131072 \
  --gpu-memory-utilization 0.9 \
  --enable-auto-tool-choice \
  --tool-call-parser openai
```

**Diferenças:**
- ✅ `--shm-size=16g` (aumentado de 8g)
- ✅ `--max-model-len 131072` (128K tokens completo)
- ✅ `--gpu-memory-utilization 0.9` (máximo aproveitamento)

---

## 📝 Próximos Passos

1. **Verificar disponibilidade de L4 em `southamerica-east1`:**
   ```bash
   gcloud compute accelerator-types list --filter="zone:southamerica-east1-a AND name:nvidia-l4"
   ```

2. **Se L4 disponível:** Criar VM com L4 em `southamerica-east1`

3. **Se L4 não disponível:** 
   - Criar VM com L4 em `us-central1` (aceitar LGPD)
   - OU criar VM com A100 em `us-central1` (melhor performance)

4. **Migrar dados da T4 para nova GPU:**
   - Parar container na T4
   - Criar nova VM com GPU maior
   - Configurar Docker e vLLM na nova VM
   - Atualizar IP no Supabase

---

**Última atualização:** 2026-01-29
