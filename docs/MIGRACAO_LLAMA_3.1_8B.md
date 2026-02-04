# Migração para Llama 3.1 8B Instruct

**Data:** 2026-01-28  
**Objetivo:** Resolver problemas de limite de contexto (4096 tokens) usando Llama 3.1 8B

---

## Comparação: Qwen2.5-3B vs Llama 3.1 8B

| Aspecto | Qwen2.5-3B-Instruct (Atual) | Llama 3.1 8B Instruct |
|--------|---------------------------|------------------------|
| **Contexto Máximo** | 4,096 tokens | **128,000 tokens** ✅ |
| **Tamanho do Modelo** | ~6GB | ~16GB |
| **Memória GPU Necessária** | ~10GB | ~20GB (sem quantização) |
| **Qualidade** | Muito Boa | **Excelente** ✅ |
| **Tool Calling** | Bom | **Excelente** ✅ |
| **Acesso** | Público | Gated (precisa token HF) |
| **Compatibilidade T4 (16GB)** | ✅ Cabe facilmente | ⚠️ Precisa quantização |

---

## ✅ Vantagens do Llama 3.1 8B

### 1. **Contexto 128K Tokens**
- **Problema atual**: Qwen2.5-3B tem apenas 4,096 tokens
- **Solução**: Llama 3.1 8B tem **128,000 tokens** (32x maior!)
- **Resultado**: Não precisará mais truncar mensagens ou system prompt

### 2. **Melhor Qualidade**
- Modelo maior (8B vs 3B) = melhor compreensão e respostas
- Melhor suporte a português brasileiro
- Melhor raciocínio complexo

### 3. **Tool Calling Superior**
- Melhor integração com ferramentas
- Menos erros de parsing
- Respostas mais consistentes

---

## ⚠️ Desafios e Soluções

### Desafio 1: Memória GPU (T4 tem 16GB)

**Problema**: Llama 3.1 8B precisa de ~20GB sem quantização.

**Solução**: Usar **quantização AWQ ou GPTQ**:

```bash
# Opção A: AWQ (recomendado - melhor qualidade)
docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  --shm-size=8g \
  -e HF_TOKEN=hf_xxxxxxxxxxxxx \
  vllm/vllm-openai:latest \
  meta-llama/Meta-Llama-3.1-8B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --quantization awq \
  --max-model-len 131072 \
  --gpu-memory-utilization 0.9
```

**Modelo quantizado**: Use `TheBloke/Llama-3.1-8B-Instruct-AWQ` (já quantizado)

### Desafio 2: Token do Hugging Face

**Problema**: Modelo é gated (requer acesso + token).

**Solução**:

1. **Obter token**:
   - Acesse [Hugging Face](https://huggingface.co/settings/tokens)
   - Crie um token com permissão de leitura
   - Solicite acesso ao modelo: [meta-llama/Meta-Llama-3.1-8B-Instruct](https://huggingface.co/meta-llama/Meta-Llama-3.1-8B-Instruct)

2. **Passar token para o container**:
   ```bash
   # Via variável de ambiente
   -e HF_TOKEN=hf_xxxxxxxxxxxxx
   
   # Ou fazer login no container
   docker exec -it vllm-chat huggingface-cli login
   ```

---

## 🌎 Questões de LGPD e Região

### ✅ Conformidade LGPD

**Importante**: A LGPD não exige uma zona específica, apenas que os dados fiquem no **território brasileiro**.

- ✅ **`southamerica-east1`** (qualquer zona) = **Brasil** → **Atende LGPD**
- ❌ **`us-central1`** = **Estados Unidos** → **Não atende LGPD**

### ⚠️ Disponibilidade de GPU

**GPUs T4 disponíveis em `southamerica-east1`**:
- ✅ `southamerica-east1-a` (T4 disponível)
- ✅ `southamerica-east1-c` (T4 disponível)
- ❌ `southamerica-east1-b` (**sem GPU disponível**)

**Recomendação**: Use `southamerica-east1-a` ou `southamerica-east1-c` (ambas atendem LGPD).

### 🔄 Migração de `us-central1-b` para `southamerica-east1`

**Opção 1: Criar Nova VM (Recomendado)**

1. Criar nova VM em `southamerica-east1-a` ou `southamerica-east1-c`
2. Configurar vLLM com Llama 3.1 8B
3. Atualizar `AI_CHAT_BASE_URL` no Supabase
4. Parar e deletar VM antiga em `us-central1-b`

**Opção 2: Manter Ambas (Alta Disponibilidade)**

1. Criar nova VM em `southamerica-east1-a`
2. Manter VM em `us-central1-b` como fallback
3. Configurar Load Balancer para rotear entre as duas

---

## 📋 Passo a Passo: Migração Completa

### Passo 0: Escolher Zona (LGPD)

**Para conformidade LGPD, use uma das zonas abaixo**:

```bash
# Opção A: southamerica-east1-a (recomendado)
ZONE="southamerica-east1-a"

# Opção B: southamerica-east1-c (alternativa)
ZONE="southamerica-east1-c"
```

**⚠️ Não use `southamerica-east1-b`** - não há GPU disponível.

### Passo 1: Obter Token do Hugging Face

1. Acesse [Hugging Face Settings > Tokens](https://huggingface.co/settings/tokens)
2. Clique em **New token**
3. Configure:
   - **Name**: `vllm-camara-na-mao`
   - **Type**: `Read`
4. Copie o token (formato: `hf_xxxxxxxxxxxxx`)

### Passo 2: Solicitar Acesso ao Modelo

1. Acesse [meta-llama/Meta-Llama-3.1-8B-Instruct](https://huggingface.co/meta-llama/Meta-Llama-3.1-8B-Instruct)
2. Clique em **Agree and access repository**
3. Aceite os termos da Meta
4. Aguarde aprovação (geralmente instantânea)

### Passo 3: Criar Nova VM em `southamerica-east1` (LGPD)

**Se você já tem a VM em `us-central1-b`, crie uma nova em `southamerica-east1`**:

```bash
# Definir zona (escolha uma das opções acima)
ZONE="southamerica-east1-a"  # ou southamerica-east1-c

# Criar nova VM com GPU T4
gcloud compute instances create llm-chat-gpu-br \
  --zone=$ZONE \
  --machine-type=n1-standard-4 \
  --accelerator="type=nvidia-tesla-t4,count=1" \
  --preemptible \
  --maintenance-policy=TERMINATE \
  --restart-on-failure \
  --boot-disk-size=200GB \
  --boot-disk-type=pd-ssd \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud

# Aguardar VM iniciar e anotar o IP externo
gcloud compute instances describe llm-chat-gpu-br --zone=$ZONE --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

**Ou se preferir manter a VM atual e apenas migrar o container**:

```bash
# Conectar na VM atual (se quiser reconfigurar)
gcloud compute ssh llm-chat-gpu --zone=us-central1-b

# Parar e remover container atual
docker stop vllm-chat
docker rm vllm-chat
```

**⚠️ Nota**: Se você criar nova VM em `southamerica-east1`, não precisa parar a antiga imediatamente. Pode manter ambas rodando durante a migração.

### Passo 4: Conectar na Nova VM e Instalar Dependências

```bash
# Conectar na nova VM (ou na antiga se estiver reconfigurando)
gcloud compute ssh llm-chat-gpu-br --zone=$ZONE

# Instalar Docker e NVIDIA Container Toolkit (se ainda não instalado)
# ... (seguir passos do guia de configuração inicial)
```

### Passo 5: Criar Container com Llama 3.1 8B (Quantizado)

**Opção A: Usar modelo já quantizado (Recomendado)**

```bash
docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  --shm-size=8g \
  -e HF_TOKEN=hf_xxxxxxxxxxxxx \
  vllm/vllm-openai:latest \
  TheBloke/Llama-3.1-8B-Instruct-AWQ \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --max-model-len 131072 \
  --gpu-memory-utilization 0.9 \
  --enable-auto-tool-choice \
  --tool-call-parser openai
```

**Opção B: Quantizar durante carregamento (mais lento)**

```bash
docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  --shm-size=8g \
  -e HF_TOKEN=hf_xxxxxxxxxxxxx \
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

### Passo 6: Verificar Carregamento

```bash
# Ver logs
docker logs -f vllm-chat

# Aguardar mensagem: "Uvicorn running on http://0.0.0.0:8000"
# Isso pode levar 5-10 minutos na primeira vez (download do modelo)

# Verificar uso de memória
docker stats vllm-chat
# Deve usar ~12-14GB de VRAM (dentro do limite de 16GB)
```

### Passo 7: Testar API

```bash
# Testar localmente
curl http://localhost:8000/v1/models

# Testar externamente (substitua pelo IP atual)
curl http://35.193.16.137:8000/v1/models

# Testar chat
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "TheBloke/Llama-3.1-8B-Instruct-AWQ",
    "messages": [{"role": "user", "content": "Olá!"}],
    "max_tokens": 100
  }'
```

### Passo 8: Atualizar Configuração no Supabase

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx)
2. Vá em **Project Settings** > **Edge Functions** > **Secrets**
3. Atualize:
   - **AI_CHAT_MODEL**: `TheBloke/Llama-3.1-8B-Instruct-AWQ` (ou `meta-llama/Meta-Llama-3.1-8B-Instruct` se não usar quantizado)
   - **AI_CHAT_BASE_URL**: `http://[IP_ATUAL]:8000/v1` (verificar IP atual da VM)

### Passo 9: Atualizar Firewall (se necessário)

```bash
# Verificar se porta 8000 está aberta
gcloud compute firewall-rules list --filter="name~allow-vllm"

# Se não existir, criar regra de firewall
gcloud compute firewall-rules create allow-vllm-8000-br \
  --allow tcp:8000 \
  --source-ranges 0.0.0.0/0 \
  --target-tags llm-chat-gpu-br \
  --description "Allow vLLM on port 8000"
```

### Passo 10: Remover Limitações de Contexto no Código

Após migrar, você pode **remover ou aumentar** as limitações no `ai-orchestrator`:

```typescript
// ANTES (Qwen2.5-3B - 4096 tokens)
const maxMessages = 3;
const maxSystemPromptChars = 4000;

// DEPOIS (Llama 3.1 8B - 128K tokens)
const maxMessages = 50; // Pode usar muito mais mensagens
const maxSystemPromptChars = 50000; // System prompt completo
```

---

## 📊 Comparação de Performance Esperada

| Métrica | Qwen2.5-3B (Atual) | Llama 3.1 8B (Quantizado) |
|---------|-------------------|---------------------------|
| **Tokens de Entrada** | 4,096 (limitado) | 131,072 (praticamente ilimitado) |
| **Mensagens de Histórico** | 3-5 | 50+ |
| **System Prompt** | Truncado (4000 chars) | Completo (50K+ chars) |
| **Qualidade de Resposta** | Muito Boa | Excelente |
| **Velocidade** | Rápida (~200ms) | Moderada (~500ms) |
| **Memória GPU** | ~10GB | ~12-14GB (quantizado) |
| **Erros de Contexto** | Frequentes | Raros |

---

## ⚡ Alternativa: Modelo Não Quantizado (Se Tiver GPU Maior)

Se no futuro você tiver acesso a GPU com mais memória (L4 24GB, A100 40GB, etc.):

```bash
docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  --shm-size=16g \
  -e HF_TOKEN=hf_xxxxxxxxxxxxx \
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

**Vantagem**: Qualidade ligeiramente melhor (sem perda de quantização)

---

## 🎯 Conclusão

**SIM, usar Llama 3.1 8B resolveria completamente os problemas de contexto!**

### Benefícios Imediatos:
- ✅ **128K tokens** vs 4K tokens (32x maior)
- ✅ Não precisará mais truncar mensagens
- ✅ System prompt completo
- ✅ Melhor qualidade de respostas
- ✅ Melhor tool calling

### Requisitos:
- ⚠️ Token do Hugging Face (fácil de obter)
- ⚠️ Quantização AWQ (necessária para T4 16GB)
- ⚠️ Tempo de carregamento inicial (~5-10 min)

### Recomendação:
**Migre para Llama 3.1 8B quantizado** - os benefícios superam os desafios, especialmente considerando que você já está enfrentando problemas de contexto.

---

**Última atualização:** 2026-01-28
