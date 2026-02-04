# Comando Correto: Llama 3.1 8B com Token HF

**Data:** 2026-01-29  
**Problema:** Modelo `TheBloke/Llama-3.1-8B-Instruct-AWQ` não existe

---

## ✅ Comando Correto

Execute na VM:

```bash
# Parar container atual
docker stop vllm-chat
docker rm vllm-chat

# Criar novo container com modelo ORIGINAL + quantização AWQ
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
  --quantization awq \
  --max-model-len 131072 \
  --gpu-memory-utilization 0.9 \
  --enable-auto-tool-choice \
  --tool-call-parser openai
```

**Diferenças importantes:**
- ✅ Modelo: `meta-llama/Meta-Llama-3.1-8B-Instruct` (original)
- ✅ Flag `--quantization awq` adicionada (quantização automática)
- ✅ Token HF passado via `-e HF_TOKEN`

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
- **AI_CHAT_MODEL**: `meta-llama/Meta-Llama-3.1-8B-Instruct`

---

**Última atualização:** 2026-01-29
