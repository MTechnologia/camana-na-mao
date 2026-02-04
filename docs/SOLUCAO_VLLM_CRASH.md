# Solução para vLLM Crashando

**Data:** 2026-01-27  
**Problema:** Container vLLM está crashando ao tentar carregar o modelo

---

## Diagnóstico

O container estava crashando durante o carregamento do modelo. Possíveis causas:

1. **Memória insuficiente**: Qwen2.5-7B-Instruct pode ser muito grande para T4 (16GB)
2. **Problema com o modelo**: Modelo pode estar corrompido ou incompatível
3. **Configuração incorreta**: Parâmetros do vLLM podem estar errados

---

## Soluções

### Solução 1: Usar Modelo Menor (Recomendado)

O Qwen2.5-7B-Instruct pode ser muito grande. Tente um modelo menor:

```bash
# Conectar na VM (após reiniciar)
gcloud compute ssh llm-chat-gpu --zone=us-central1-b

# Remover container atual
docker rm -f vllm-chat

# Usar modelo menor (1.5B ou 3B)
docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  vllm/vllm-openai:latest \
  Qwen/Qwen2.5-1.5B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --max-model-len 2048
```

### Solução 2: Ajustar Parâmetros de Memória

```bash
docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  --shm-size=10g \
  vllm/vllm-openai:latest \
  Qwen/Qwen2.5-7B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.85
```

### Solução 3: Usar Quantização (Reduz Memória)

```bash
docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  vllm/vllm-openai:latest \
  Qwen/Qwen2.5-7B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --quantization awq \
  --max-model-len 4096
```

### Solução 4: Verificar Logs Detalhados

```bash
# Ver logs completos do container
docker logs vllm-chat 2>&1 | tail -100

# Verificar uso de memória
docker stats vllm-chat

# Verificar logs do sistema
dmesg | tail -50
```

---

## Modelos Recomendados para T4 (16GB)

| Modelo | Tamanho | Memória Necessária | Qualidade |
|--------|---------|-------------------|-----------|
| Qwen2.5-1.5B-Instruct | ~3GB | ~6GB | Boa |
| Qwen2.5-3B-Instruct | ~6GB | ~10GB | Muito Boa |
| Qwen2.5-7B-Instruct | ~14GB | ~18GB | Excelente (pode não caber) |
| Llama-3.1-8B-Instruct | ~16GB | ~20GB | Excelente (não cabe sem quantização) |

**Recomendação**: Use **Qwen2.5-3B-Instruct** para melhor equilíbrio entre qualidade e memória.

---

## Comando Completo Recomendado

```bash
# Após VM reiniciar, conectar
gcloud compute ssh llm-chat-gpu --zone=us-central1-b

# Remover container antigo
docker rm -f vllm-chat

# Criar novo com modelo 3B (melhor para T4)
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
  --max-model-len 8192 \
  --gpu-memory-utilization 0.9

# Verificar logs
docker logs -f vllm-chat
```

---

## Atualizar Configuração no Supabase

Após o modelo carregar com sucesso, atualize no Supabase:

1. **AI_CHAT_BASE_URL**: `http://34.41.3.173:8000/v1` (ou novo IP se mudou)
2. **AI_CHAT_MODEL**: `Qwen/Qwen2.5-3B-Instruct` (ou o modelo que você escolheu)

---

## Verificação Final

Após o container iniciar:

```bash
# Verificar se está rodando
docker ps | grep vllm-chat

# Verificar logs (deve mostrar "Uvicorn running")
docker logs vllm-chat --tail 20 | grep -i uvicorn

# Testar API
curl http://localhost:8000/v1/models

# Testar externamente
curl http://34.41.3.173:8000/v1/models
```

---

**Última atualização:** 2026-01-27
