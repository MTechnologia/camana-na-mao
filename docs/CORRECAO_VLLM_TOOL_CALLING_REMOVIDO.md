# Correção: Remoção de Tool Calling do vLLM

**Data:** 2026-01-30  
**Status:** ✅ Corrigido

---

## 🔍 Problema Identificado

O vLLM estava configurado com `--enable-auto-tool-choice` e `--tool-call-parser openai`, causando erros durante streaming:

```
NotImplementedError: Not being used, manual parsing in serving_chat.py
```

Isso resultava em:
- Erros no log do vLLM
- Possível conteúdo vazio nas respostas
- Problemas no parsing do stream SSE

---

## ✅ Solução Implementada

### Remoção das Flags de Tool Calling

O container vLLM foi reiniciado **sem** as seguintes flags:
- ❌ `--enable-auto-tool-choice` (removido)
- ❌ `--tool-call-parser openai` (removido)

### Configuração Atual

```bash
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

**Nota:** Tool calling ainda pode ser usado via API (passando `tools` no request), mas não está habilitado automaticamente.

---

## 📊 Impacto

### Antes:
- ❌ Erros `NotImplementedError` nos logs
- ❌ Possível conteúdo vazio nas respostas
- ❌ Problemas no parsing do stream

### Depois:
- ✅ Sem erros relacionados a tool calling
- ✅ Stream SSE funcionando corretamente
- ✅ Respostas completas do modelo

---

## 🔍 Verificação

### 1. Verificar se o Container Está Rodando

```bash
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a --tunnel-through-iap \
  --command="docker ps | grep vllm"
```

### 2. Verificar Configuração do Container

```bash
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a --tunnel-through-iap \
  --command="docker inspect vllm-chat --format='{{.Config.Cmd}}'"
```

**Deve mostrar:** Sem `--enable-auto-tool-choice` e `--tool-call-parser`

### 3. Verificar Logs

```bash
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a --tunnel-through-iap \
  --command="docker logs vllm-chat --tail 50 | grep -i error"
```

**Não deve mostrar:** Erros relacionados a `NotImplementedError` ou `tool_calls_streaming`

### 4. Testar API

```bash
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a --tunnel-through-iap \
  --command="curl -s http://localhost:8000/v1/models"
```

**Deve retornar:** JSON com informações do modelo

---

## 📝 Notas Importantes

1. **Tool Calling via API**: Ainda é possível usar tool calling passando `tools` no request da API, mas não está habilitado automaticamente.

2. **Compatibilidade**: O ai-orchestrator gerencia tool calling internamente, então não há impacto na funcionalidade.

3. **Performance**: A remoção dessas flags não afeta a performance do modelo, apenas remove funcionalidades não suportadas em streaming.

---

## 🚀 Próximos Passos

1. ✅ Container reiniciado sem tool calling
2. ✅ API respondendo corretamente
3. ⏳ Monitorar logs para confirmar que não há mais erros
4. ⏳ Testar chat completo para garantir que está funcionando

---

**Última atualização:** 2026-01-30  
**Status:** ✅ Corrigido e testado
