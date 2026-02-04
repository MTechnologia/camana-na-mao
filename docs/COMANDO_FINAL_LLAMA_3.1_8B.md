# Comando Final: Llama 3.1 8B (Sem Quantização)

**Data:** 2026-01-29  
**Problema:** Modelos AWQ não encontrados no Hugging Face

---

## ✅ Solução: Modelo Original Sem Quantização

Como não encontramos modelos Llama 3.1 8B quantizados AWQ válidos, vamos usar o modelo original **sem quantização**, mas com parâmetros reduzidos para caber na GPU T4 16GB:

```bash
# Parar container atual
docker stop vllm-chat
docker rm vllm-chat

# Criar novo container com modelo ORIGINAL (sem quantização)
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

**Parâmetros importantes:**
- ✅ **Removido** `--quantization awq` (modelo não é pré-quantizado)
- ✅ **Reduzido** `--max-model-len` para `8192` (pode não caber 131072 na T4 16GB)
- ✅ **Reduzido** `--gpu-memory-utilization` para `0.85` (deixa margem de segurança)

---

## 🔄 Alternativa: Voltar para Qwen2.5-3B

Se o modelo acima não caber na GPU, volte para o Qwen2.5-3B que já estava funcionando:

```bash
docker stop vllm-chat && docker rm vllm-chat

docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  --shm-size=8g \
  vllm/vllm-openai:latest \
  Qwen/Qwen2.5-3B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --max-model-len 131072 \
  --gpu-memory-utilization 0.9 \
  --enable-auto-tool-choice \
  --tool-call-parser openai
```

---

## 🔍 Verificar Logs

```bash
docker logs -f vllm-chat
```

**Aguarde 5-10 minutos** para o modelo baixar e carregar.

**Se aparecer erro de memória (CUDA out of memory):**
- Use a alternativa Qwen2.5-3B acima
- Ou reduza ainda mais `--max-model-len` para `4096`

---

## 📝 Atualizar no Supabase

Após o container iniciar com sucesso:

- **AI_CHAT_BASE_URL**: `http://136.116.72.218:8000/v1`
- **AI_CHAT_MODEL**: `meta-llama/Meta-Llama-3.1-8B-Instruct` (Opção 1) ou `Qwen/Qwen2.5-3B-Instruct` (Alternativa)

---

**Última atualização:** 2026-01-29
