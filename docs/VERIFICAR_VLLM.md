# Como Verificar se o vLLM está Rodando

**Data:** 2026-01-27  
**VM:** `llm-chat-gpu` (us-central1-b)  
**IP:** `35.193.16.137`

---

## Método 1: Verificar via SSH (Recomendado)

### Passo 1: Conectar na VM

```bash
gcloud compute ssh llm-chat-gpu --zone=us-central1-b
```

### Passo 2: Verificar se o container está rodando

```bash
docker ps
```

**Resultado esperado:**
```
CONTAINER ID   IMAGE                    COMMAND                  CREATED        STATUS        PORTS                    NAMES
674c51745379   vllm/vllm-openai:latest  "python -m vllm.entryp…"  X hours ago    Up X hours    0.0.0.0:8000->8000/tcp   vllm-chat
```

### Passo 3: Verificar logs do container

```bash
docker logs vllm-chat --tail 50
```

**Procure por:**
- `INFO: Application startup complete`
- `Uvicorn running on http://0.0.0.0:8000`
- Sem erros de conexão ou modelo

### Passo 4: Testar a API localmente na VM

```bash
curl http://localhost:8000/v1/models
```

**Resultado esperado:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "Qwen/Qwen2.5-7B-Instruct",
      "object": "model",
      ...
    }
  ]
}
```

---

## Método 2: Verificar via Internet (Fora da VM)

### Passo 1: Testar se a porta está acessível

**No PowerShell (Windows):**
```powershell
Test-NetConnection -ComputerName 35.193.16.137 -Port 8000
```

**Ou usando curl (se tiver):**
```bash
curl http://35.193.16.137:8000/v1/models
```

### Passo 2: Verificar firewall do GCP

```bash
gcloud compute firewall-rules list --filter="name~allow OR name~vllm OR name~8000"
```

**Se não houver regra, crie uma:**
```bash
gcloud compute firewall-rules create allow-vllm-8000 \
  --allow tcp:8000 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow vLLM API access" \
  --direction INGRESS
```

---

## Método 3: Verificar via GCP Console

### Passo 1: Acessar GCP Console

1. Acesse [GCP Console](https://console.cloud.google.com)
2. Vá em **Compute Engine** > **VM instances**
3. Encontre `llm-chat-gpu`

### Passo 2: Verificar Status

- **Status** deve estar: `Running` (verde)
- **External IP** deve ser: `35.193.16.137`

### Passo 3: Verificar Logs

1. Clique em `llm-chat-gpu`
2. Vá na aba **Logs**
3. Procure por mensagens do Docker/vLLM

---

## Troubleshooting

### Problema: Container não está rodando

**Solução:**
```bash
# Conectar na VM
gcloud compute ssh llm-chat-gpu --zone=us-central1-b

# Verificar se o container existe
docker ps -a

# Se existir mas estiver parado, iniciar:
docker start vllm-chat

# Se não existir, recriar:
docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  vllm/vllm-openai:latest \
  --model Qwen/Qwen2.5-7B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1
```

### Problema: Porta 8000 não está acessível

**Solução:**
```bash
# Criar regra de firewall
gcloud compute firewall-rules create allow-vllm-8000 \
  --allow tcp:8000 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow vLLM API access" \
  --direction INGRESS

# Verificar se foi criada
gcloud compute firewall-rules describe allow-vllm-8000
```

### Problema: "Connection refused" ou timeout

**Possíveis causas:**
1. Container não está rodando
2. Firewall bloqueando
3. vLLM não está escutando em `0.0.0.0:8000`

**Solução:**
```bash
# Verificar se está escutando
gcloud compute ssh llm-chat-gpu --zone=us-central1-b
sudo netstat -tlnp | grep 8000
# Deve mostrar: 0.0.0.0:8000

# Verificar logs do container
docker logs vllm-chat --tail 100
```

### Problema: vLLM está rodando mas retorna erro 401

**Causa**: vLLM pode estar configurado com autenticação.

**Solução**: Verifique se o vLLM requer API key. Se sim, configure `AI_CHAT_API_KEY` no Supabase.

---

## Comandos Rápidos de Verificação

### Checklist Completo:

```bash
# 1. Verificar se VM está rodando
gcloud compute instances describe llm-chat-gpu --zone=us-central1-b --format="get(status)"

# 2. Conectar e verificar container
gcloud compute ssh llm-chat-gpu --zone=us-central1-b --command="docker ps | grep vllm-chat"

# 3. Testar API localmente na VM
gcloud compute ssh llm-chat-gpu --zone=us-central1-b --command="curl -s http://localhost:8000/v1/models | head -20"

# 4. Testar API externamente
curl http://35.193.16.137:8000/v1/models

# 5. Verificar firewall
gcloud compute firewall-rules list --filter="allowed.ports:8000"
```

---

## Configuração no Supabase

Após confirmar que o vLLM está rodando e acessível:

1. **Supabase Dashboard** > **Project Settings** > **Edge Functions** > **Secrets**
2. Adicione:
   - **Name**: `AI_CHAT_BASE_URL`
   - **Value**: `http://35.193.16.137:8000/v1`
3. (Opcional) Adicione:
   - **Name**: `AI_CHAT_MODEL`
   - **Value**: `Qwen/Qwen2.5-7B-Instruct`

---

**Última atualização:** 2026-01-27
