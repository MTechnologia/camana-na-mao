# Como Executar o Script de Configuração do Llama 3.1 8B

**Script:** `scripts/configurar-llama-3.1.ps1`

---

## 🚀 Método 1: PowerShell (Recomendado)

### Passo 1: Abrir PowerShell

1. Pressione `Windows + X`
2. Selecione **Windows PowerShell** ou **Terminal**
3. Navegue até a pasta do projeto:
   ```powershell
   cd C:\Projetos\camana-na-mao
   ```

### Passo 2: Executar o Script

```powershell
# Substitua pelo seu token completo do Hugging Face
.\scripts\configurar-llama-3.1.ps1 -HFToken "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..."
```

**Exemplo completo:**
```powershell
.\scripts\configurar-llama-3.1.ps1 -HFToken "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..."
```

### Passo 3: Se Der Erro de Política de Execução

Se aparecer o erro:
```
cannot be loaded because running scripts is disabled on this system
```

**Solução 1: Executar com bypass (temporário)**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\configurar-llama-3.1.ps1 -HFToken "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..."
```

**Solução 2: Alterar política (permanente)**
```powershell
# Executar como Administrador
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Depois execute normalmente:
```powershell
.\scripts\configurar-llama-3.1.ps1 -HFToken "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..."
```

---

## 🔧 Método 2: Executar Manualmente (Passo a Passo)

Se preferir executar os comandos manualmente:

### 1. Conectar na VM

```bash
gcloud compute ssh llm-chat-gpu --zone=us-central1-b
```

### 2. Parar Container Atual

```bash
docker stop vllm-chat
docker rm vllm-chat
```

### 3. Criar Novo Container

```bash
# Substitua pelo seu token completo
HF_TOKEN="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..."

docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  --shm-size=8g \
  -e HF_TOKEN="$HF_TOKEN" \
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

### 4. Ver Logs

```bash
docker logs -f vllm-chat
```

---

## 📋 Opções do Script

O script aceita os seguintes parâmetros:

```powershell
# Parâmetros obrigatórios
-HFToken "hf_..."          # Token do Hugging Face (obrigatório)

# Parâmetros opcionais
-Zone "us-central1-b"       # Zona da VM (padrão: us-central1-b)
-VMName "llm-chat-gpu"      # Nome da VM (padrão: llm-chat-gpu)
-Model "TheBloke/..."      # Modelo (padrão: TheBloke/Llama-3.1-8B-Instruct-AWQ)
```

**Exemplo com parâmetros customizados:**
```powershell
.\scripts\configurar-llama-3.1.ps1 `
  -HFToken "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..." `
  -Zone "southamerica-east1-a" `
  -VMName "llm-chat-gpu-br"
```

---

## ✅ Verificação Após Execução

### 1. Verificar Container

```bash
# Via SSH na VM
gcloud compute ssh llm-chat-gpu --zone=us-central1-b --command="docker ps | grep vllm"
```

### 2. Ver Logs

```bash
gcloud compute ssh llm-chat-gpu --zone=us-central1-b --command="docker logs vllm-chat --tail 50"
```

### 3. Testar API

```bash
# Obter IP da VM
gcloud compute instances describe llm-chat-gpu --zone=us-central1-b --format="get(networkInterfaces[0].accessConfigs[0].natIP)"

# Testar (substitua pelo IP)
curl http://[IP]:8000/v1/models
```

---

## 🐛 Troubleshooting

### Erro: "cannot be loaded because running scripts is disabled"

**Solução:**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\configurar-llama-3.1.ps1 -HFToken "hf_..."
```

### Erro: "gcloud: command not found"

**Solução:** Instale o Google Cloud SDK:
1. Baixe: https://cloud.google.com/sdk/docs/install
2. Execute o instalador
3. Execute `gcloud init` para configurar

### Erro: "VM not found"

**Solução:** Verifique o nome e zona da VM:
```bash
gcloud compute instances list
```

### Erro: "Permission denied" no Docker

**Solução:** Execute dentro da VM:
```bash
sudo usermod -aG docker $USER
# Depois faça logout e login novamente
```

---

## 📝 Exemplo Completo de Execução

```powershell
# 1. Abrir PowerShell
# 2. Navegar para o projeto
cd C:\Projetos\camana-na-mao

# 3. Executar o script
.\scripts\configurar-llama-3.1.ps1 -HFToken "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..."

# 4. Aguardar execução (pode levar alguns minutos)
# 5. Verificar logs quando solicitado
```

---

**Última atualização:** 2026-01-28
