# Comando Correto: Llama 3.1 8B AWQ (Pré-Quantizado)

**Data:** 2026-01-29  
**Problema:** Modelo original não tem arquivo de configuração AWQ

---

## ✅ Solução: Usar Modelo Já Quantizado AWQ

O modelo `meta-llama/Meta-Llama-3.1-8B-Instruct` é o **original não quantizado**. Precisamos usar um modelo que **já vem quantizado AWQ**.

### Opção 1: casperhansen/llama-3.1-8b-instruct-awq (Recomendado)

```bash
# Parar container atual
docker stop vllm-chat
docker rm vllm-chat

# Criar novo container com modelo PRÉ-QUANTIZADO AWQ
HF_TOKEN="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"

docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  --shm-size=8g \
  -e HF_TOKEN="$HF_TOKEN" \
  vllm/vllm-openai:latest \
  casperhansen/llama-3.1-8b-instruct-awq \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --max-model-len 131072 \
  --gpu-memory-utilization 0.9 \
  --enable-auto-tool-choice \
  --tool-call-parser openai
```

**⚠️ IMPORTANTE:** 
- **NÃO** use `--quantization awq` quando o modelo já vem quantizado
- O modelo `casperhansen/llama-3.1-8b-instruct-awq` já está quantizado AWQ

### Opção 2: Tentar Modelo Original Sem Quantização

Se quiser tentar o modelo original (pode não caber na T4 16GB):

```bash
docker stop vllm-chat
docker rm vllm-chat

HF_TOKEN="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"

docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  --shm-size=8g \
  -e HF_TOKEN="$HF_TOKEN" \
  vllm/vllm-openai:latest \
  meta-llama/Meta-Llama-3.1-8B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.85 \
  --enable-auto-tool-choice \
  --tool-call-parser openai
```

**Nota:** 
- **Removido** `--quantization awq`
- **Reduzido** `--max-model-len` para `8192` (pode não caber 131072)
- **Reduzido** `--gpu-memory-utilization` para `0.85`

---

## 🔍 Verificar Logs

```bash
docker logs -f vllm-chat
```

**Aguarde 5-10 minutos** para o modelo baixar e carregar.

---

## 📝 Atualizar no Supabase

Após o container iniciar com sucesso:

- **AI_CHAT_BASE_URL**: `http://136.116.72.218:8000/v1`
- **AI_CHAT_MODEL**: `casperhansen/llama-3.1-8b-instruct-awq` (Opção 1) ou `meta-llama/Meta-Llama-3.1-8B-Instruct` (Opção 2)

---

**Última atualização:** 2026-01-29
