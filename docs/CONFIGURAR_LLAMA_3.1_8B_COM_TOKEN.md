# Configuração: Llama 3.1 8B com Token Hugging Face

**Data:** 2026-01-28  
**Token HF:** `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...`  
**Modelo:** `meta-llama/Meta-Llama-3.1-8B-Instruct`

---

## 🎯 Objetivo

Configurar o vLLM para usar o modelo Llama 3.1 8B Instruct com o token do Hugging Face, resolvendo os problemas de limite de contexto (4096 tokens → 128K tokens).

---

## 📋 Pré-requisitos

- ✅ Token do Hugging Face obtido
- ✅ Acesso ao modelo `meta-llama/Meta-Llama-3.1-8B-Instruct` aprovado
- ✅ VM `llm-chat-gpu` rodando (zona: `us-central1-b` ou `southamerica-east1-*`)
- ✅ Docker e NVIDIA drivers instalados

---

## 🚀 Passo a Passo

### Passo 1: Conectar na VM

```bash
# Conectar na VM atual
gcloud compute ssh llm-chat-gpu --zone=us-central1-b

# Ou se estiver em outra zona:
# gcloud compute ssh llm-chat-gpu --zone=southamerica-east1-a
```

### Passo 2: Parar e Remover Container Atual

```bash
# Parar container atual
docker stop vllm-chat

# Remover container
docker rm vllm-chat
```

### Passo 3: Criar Novo Container com Llama 3.1 8B (Quantizado AWQ)

**⚠️ IMPORTANTE**: Usamos o modelo original `meta-llama/Meta-Llama-3.1-8B-Instruct` com quantização AWQ porque:
- ✅ Cabe na GPU T4 (16GB) com quantização
- ✅ Mantém boa qualidade
- ✅ Suporta 128K tokens de contexto
- ✅ Modelo oficial da Meta

```bash
# Substitua o token abaixo pelo seu token completo
HF_TOKEN="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..."

# Criar container com Llama 3.1 8B (quantização AWQ aplicada automaticamente)
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

**Nota**: A flag `--quantization awq` faz o vLLM aplicar quantização AWQ automaticamente durante o carregamento, permitindo que o modelo caiba na GPU T4 (16GB).

**Explicação dos parâmetros:**
- `--max-model-len 131072`: Contexto de 128K tokens (131072 = 128 * 1024)
- `--gpu-memory-utilization 0.9`: Usa 90% da memória GPU (deixa 10% de margem)
- `--enable-auto-tool-choice`: Habilita tool calling automático
- `--tool-call-parser openai`: Usa parser OpenAI para tool calling
- `-e HF_TOKEN`: Passa o token do Hugging Face para o container

### Passo 4: Verificar Logs do Container

```bash
# Ver logs em tempo real
docker logs -f vllm-chat

# Aguarde até ver a mensagem:
# "Uvicorn running on http://0.0.0.0:8000"
```

**⏱️ Tempo esperado**: 5-10 minutos na primeira vez (download do modelo ~16GB)

**Logs esperados:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Loading model meta-llama/Meta-Llama-3.1-8B-Instruct with AWQ quantization...
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**⚠️ Se aparecer erro de autenticação:**
- Verifique se aceitou os termos do modelo em: https://huggingface.co/meta-llama/Meta-Llama-3.1-8B-Instruct
- Verifique se o token está completo e correto
- Tente fazer login manualmente: `huggingface-cli login` dentro do container

### Passo 5: Verificar Uso de Memória GPU

```bash
# Verificar uso de memória
docker stats vllm-chat --no-stream

# Deve mostrar algo como:
# CONTAINER   MEM USAGE / LIMIT   MEM %   GPU MEM
# vllm-chat   12.5GiB / 16GiB     78%     12.5GiB / 15.9GiB
```

**✅ Esperado**: ~12-14GB de VRAM (dentro do limite de 16GB)

### Passo 6: Testar API Localmente

```bash
# Testar modelos disponíveis
curl http://localhost:8000/v1/models

# Deve retornar:
# {"data":[{"id":"meta-llama/Meta-Llama-3.1-8B-Instruct",...}]}

# Testar chat
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Meta-Llama-3.1-8B-Instruct",
    "messages": [{"role": "user", "content": "Olá, como você está?"}],
    "max_tokens": 100
  }'
```

### Passo 7: Obter IP Externo da VM

```bash
# Ver IP externo
curl -H "Metadata-Flavor: Google" http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip

# Ou via gcloud (em outra janela de terminal):
gcloud compute instances describe llm-chat-gpu --zone=us-central1-b --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

**Anote o IP** (ex: `35.193.16.137` ou `34.41.3.173`)

### Passo 8: Testar API Externamente

```bash
# Testar de fora da VM (substitua pelo IP atual)
curl http://35.193.16.137:8000/v1/models

# Se não funcionar, verifique o firewall (Passo 9)
```

### Passo 9: Verificar/Criar Regra de Firewall

```bash
# Verificar regras existentes
gcloud compute firewall-rules list --filter="name~allow-vllm"

# Se não existir, criar regra (substitua o target-tags se necessário)
gcloud compute firewall-rules create allow-vllm-8000 \
  --allow tcp:8000 \
  --source-ranges 0.0.0.0/0 \
  --target-tags llm-chat-gpu \
  --description "Allow vLLM on port 8000"
```

### Passo 10: Atualizar Configuração no Supabase

1. **Acesse**: https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx
2. **Vá em**: **Project Settings** → **Edge Functions** → **Secrets**
3. **Atualize os seguintes secrets**:

#### Secret 1: `AI_CHAT_BASE_URL`
- **Name**: `AI_CHAT_BASE_URL`
- **Value**: `http://[IP_ATUAL]:8000/v1` (substitua pelo IP do Passo 7)
- Exemplo: `http://35.193.16.137:8000/v1`

#### Secret 2: `AI_CHAT_MODEL`
- **Name**: `AI_CHAT_MODEL`
- **Value**: `meta-llama/Meta-Llama-3.1-8B-Instruct`

#### Secret 3: `AI_API_KEY` (manter)
- **Name**: `AI_API_KEY`
- **Value**: `dummy` (ou qualquer valor - vLLM não usa autenticação)

### Passo 11: Aguardar e Testar

1. **Aguarde 1-2 minutos** para o Supabase recarregar os secrets
2. **Teste no app/web** enviando uma mensagem no chat
3. **Verifique os logs** do `ai-orchestrator` no Supabase

**Logs esperados (sucesso):**
```
[ai-orchestrator] Using AI_CHAT_BASE_URL: http://35.193.16.137:8000/v1
[ai-orchestrator] Request to http://35.193.16.137:8000/v1/chat/completions
```

---

## 🔍 Verificação Final

### 1. Container Rodando

```bash
docker ps | grep vllm-chat
# Deve mostrar o container rodando
```

### 2. API Acessível

```bash
curl http://localhost:8000/v1/models
# Deve retornar JSON com o modelo
```

### 3. Memória GPU

```bash
nvidia-smi
# Deve mostrar uso de ~12-14GB de VRAM
```

### 4. Logs do Supabase

Verifique os logs do `ai-orchestrator` no Supabase Dashboard:
- ✅ Deve usar `AI_CHAT_BASE_URL`
- ✅ Deve usar modelo `TheBloke/Llama-3.1-8B-Instruct-AWQ`
- ✅ Não deve ter erros de contexto

---

## 🎉 Benefícios Imediatos

Após a configuração, você terá:

- ✅ **128K tokens de contexto** (vs 4K antes)
- ✅ **Não precisará mais truncar mensagens**
- ✅ **System prompt completo** (sem truncamento)
- ✅ **Melhor qualidade de respostas**
- ✅ **Melhor tool calling**

---

## 🐛 Troubleshooting

### Erro: "401 Unauthorized" ao baixar modelo

**Causa**: Token do Hugging Face inválido ou sem acesso ao modelo.

**Solução**:
1. Verifique se o token está correto
2. Acesse https://huggingface.co/meta-llama/Meta-Llama-3.1-8B-Instruct
3. Certifique-se de que aceitou os termos e tem acesso

### Erro: "CUDA out of memory"

**Causa**: Modelo não quantizado não cabe na GPU.

**Solução**: Use o modelo quantizado `TheBloke/Llama-3.1-8B-Instruct-AWQ` (já está no comando acima).

### Erro: "Connection refused" externamente

**Causa**: Firewall não está configurado.

**Solução**: Execute o Passo 9 para criar a regra de firewall.

### Modelo não carrega

**Causa**: Download do modelo pode estar travado.

**Solução**:
```bash
# Ver logs detalhados
docker logs vllm-chat --tail 100

# Se necessário, reinicie o container
docker restart vllm-chat
```

---

## 📝 Comandos de Referência Rápida

```bash
# Ver logs
docker logs -f vllm-chat

# Reiniciar container
docker restart vllm-chat

# Parar container
docker stop vllm-chat

# Ver uso de memória
docker stats vllm-chat

# Testar API
curl http://localhost:8000/v1/models
```

---

## 🔄 Próximos Passos (Opcional)

Após a migração bem-sucedida, você pode:

1. **Remover limitações de contexto no código** (`ai-orchestrator/index.ts`):
   - Aumentar `maxMessages` de 3 para 50+
   - Aumentar `maxSystemPromptChars` de 4000 para 50000+

2. **Migrar para zona brasileira** (LGPD):
   - Criar nova VM em `southamerica-east1-a` ou `southamerica-east1-c`
   - Replicar configuração
   - Atualizar `AI_CHAT_BASE_URL` no Supabase

---

**Última atualização:** 2026-01-28  
**Status:** Pronto para configuração ✅
