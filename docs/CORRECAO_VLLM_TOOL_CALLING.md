# Correção: vLLM Tool Calling

**Data:** 2026-01-28  
**Problema:** Erro 400 - `"auto" tool choice requires --enable-auto-tool-choice and --tool-call-parser to be set`

---

## 🔍 Problema Identificado

O vLLM retornou erro 400 com a mensagem:
```
"auto" tool choice requires --enable-auto-tool-choice and --tool-call-parser to be set
```

Isso significa que o container do vLLM precisa ser iniciado com flags específicas para suportar tool calling.

---

## ✅ Solução

Recriar o container do vLLM com as flags necessárias:

```bash
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
  --max-model-len 4096 \
  --gpu-memory-utilization 0.7 \
  --max-num-seqs 64 \
  --enable-auto-tool-choice \
  --tool-call-parser openai
```

### Flags Adicionadas

- `--enable-auto-tool-choice`: Habilita suporte a tool calling automático
- `--tool-call-parser openai`: Define o parser de tool calls como "openai" (compatível com OpenAI format)

---

## 🔄 Comando Completo para Recriar

Se precisar recriar o container no futuro:

```bash
# Conectar na VM
gcloud compute ssh llm-chat-gpu --zone=us-central1-b

# Remover container antigo
docker rm -f vllm-chat

# Criar novo com tool calling habilitado
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
  --max-model-len 4096 \
  --gpu-memory-utilization 0.7 \
  --max-num-seqs 64 \
  --enable-auto-tool-choice \
  --tool-call-parser openai

# Verificar logs
docker logs -f vllm-chat
```

---

## ✅ Verificação

Após recriar o container:

1. **Aguarde o modelo carregar** (2-3 minutos)
2. **Verifique se está rodando:**
   ```bash
   docker ps | grep vllm-chat
   ```
3. **Teste tool calling:**
   - Envie uma mensagem no chat que requer tool calling
   - Deve funcionar sem erro 400

---

## 📝 Nota sobre Versões do vLLM

Essas flags podem não estar disponíveis em versões antigas do vLLM. Se der erro ao iniciar o container, verifique:

1. **Versão do vLLM**: Use a versão mais recente (`vllm/vllm-openai:latest`)
2. **Documentação**: Consulte a documentação do vLLM para versões específicas
3. **Alternativa**: Usar provedor com suporte nativo a tool calling

---

## 🔄 Fallback Automático

Mesmo com tool calling habilitado, o sistema ainda tem fallback automático:

1. **vLLM com tool calling** (principal)
2. **Provedor alternativo** (se `AI_CHAT_BASE_URL` for trocado)
3. **Mensagem amigável** (se ambos falharem)

---

**Última atualização:** 2026-01-28
