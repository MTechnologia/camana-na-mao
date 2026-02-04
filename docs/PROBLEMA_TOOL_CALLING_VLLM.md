# Problema: Tool Calling no vLLM durante Streaming

**Data:** 2026-01-29  
**Status:** ⚠️ Erro identificado, mas não crítico

---

## 🔍 Problema Identificado

Os logs do vLLM mostram erros recorrentes quando o modelo tenta usar tool calling durante streaming:

```
NotImplementedError: Not being used, manual parsing in serving_chat.py
```

### Onde ocorre:
- **Arquivo:** `vllm/tool_parsers/openai_tool_parser.py:111`
- **Função:** `extract_tool_calls_streaming`
- **Contexto:** Durante streaming de chat completions com tool calling habilitado

---

## 📊 Impacto

### ✅ O que está funcionando:
- Requisições retornam **200 OK** mesmo com o erro
- O sistema consegue se recuperar e continuar
- Chat funciona, mas pode ter problemas intermitentes

### ⚠️ Possíveis problemas:
- Tool calls podem não ser processados corretamente durante streaming
- Respostas podem ser truncadas ou incompletas
- Experiência do usuário pode ser afetada em alguns casos

---

## 🔧 Soluções Possíveis

### Solução 1: Desabilitar Tool Calling no vLLM (Recomendado)

O vLLM foi iniciado com `--enable-auto-tool-choice` e `--tool-call-parser openai`, mas essa funcionalidade não está totalmente implementada para streaming.

**Ação:** Remover essas flags do container vLLM:

```bash
# Parar o container atual
docker stop vllm-chat
docker rm vllm-chat

# Reiniciar sem tool calling
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
  # REMOVIDO: --enable-auto-tool-choice
  # REMOVIDO: --tool-call-parser openai
```

**Nota:** O ai-orchestrator está usando o **Lovable AI Gateway**, não o vLLM diretamente. Portanto, esse erro pode estar vindo de requisições diretas ao vLLM ou de algum fallback.

### Solução 2: Atualizar vLLM para versão mais recente

Versões mais recentes do vLLM podem ter melhor suporte para tool calling em streaming:

```bash
# Verificar versão atual
docker exec vllm-chat vllm --version

# Atualizar para versão mais recente
docker pull vllm/vllm-openai:latest
```

### Solução 3: Usar modo não-streaming para tool calls

Modificar o ai-orchestrator para usar modo não-streaming quando tool calling for necessário.

---

## 🔍 Verificações

### 1. Verificar se o vLLM está sendo usado diretamente

```bash
# Ver logs recentes
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a --tunnel-through-iap \
  --command="docker logs vllm-chat --tail 100 | grep -E '(POST|GET|ERROR)'"
```

### 2. Verificar configuração do ai-orchestrator

O código atual usa apenas o Lovable AI Gateway. Se houver requisições indo para o vLLM, pode ser:
- Fallback automático
- Configuração de secrets diferente
- Requisições diretas de outros serviços

### 3. Verificar frequência do erro

```bash
# Contar erros nas últimas 24h
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a --tunnel-through-iap \
  --command="docker logs vllm-chat 2>&1 | grep -c 'NotImplementedError'"
```

---

## 📝 Próximos Passos

1. **Verificar se o vLLM está sendo usado:** Confirmar se há requisições diretas ao vLLM
2. **Se não estiver sendo usado:** O erro pode ser ignorado (vLLM rodando mas não usado)
3. **Se estiver sendo usado:** Aplicar Solução 1 (remover tool calling do vLLM)
4. **Monitorar:** Acompanhar se o erro afeta a experiência do usuário

---

## ✅ Status Atual

- **Erro identificado:** ✅ Sim
- **Impacto no chat:** ❌ **NÃO** - O chat está usando Lovable AI Gateway, não o vLLM
- **Ação necessária:** Nenhuma ação imediata necessária
- **Prioridade:** Baixa (erro não está afetando o chat atual)

### 🔍 Descoberta Importante

O código do `ai-orchestrator` está **hardcoded** para usar apenas o Lovable AI Gateway:

```typescript
response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  // ... sempre usa Lovable
});
```

**Isso significa:**
- ✅ O erro do vLLM **NÃO está afetando** o chat atual
- ⚠️ As requisições que chegam no vLLM são provavelmente de:
  - Health checks
  - Testes manuais
  - Outros serviços
- 📝 O vLLM está rodando, mas não está sendo usado pelo chat principal

### 🎯 Conclusão

**O problema no chat NÃO está relacionado ao erro do vLLM.** Se há problemas no chat, eles provavelmente vêm de:
1. Problemas com o Lovable AI Gateway
2. Erros no código do ai-orchestrator
3. Problemas de rede/conectividade

**Próximos passos para diagnosticar problemas no chat:**
1. Verificar logs do Supabase Edge Function `ai-orchestrator`
2. Verificar se há erros 400/500 nas requisições
3. Verificar se o Lovable AI Gateway está respondendo corretamente

---

**Última atualização:** 2026-01-29
