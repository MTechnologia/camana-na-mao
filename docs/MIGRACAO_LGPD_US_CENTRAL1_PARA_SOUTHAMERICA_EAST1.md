# Migração LGPD: us-central1 → southamerica-east1

**Data:** 2026-01-28  
**Objetivo:** Migrar VM `llm-chat-gpu` de `us-central1-b` (EUA) para `southamerica-east1` (Brasil) para conformidade LGPD

---

## 🎯 Por que Migrar?

### Conformidade LGPD

- ✅ **`southamerica-east1`** (Brasil) = **Atende LGPD**
- ❌ **`us-central1`** (EUA) = **Não atende LGPD**

A LGPD exige que dados pessoais de cidadãos brasileiros sejam processados e armazenados no **território brasileiro**. Processar dados em `us-central1` (Iowa, EUA) pode violar a LGPD.

### Impacto

- **Dados processados**: Mensagens de chat, histórico de conversas, dados de usuários
- **Risco**: Violação de LGPD pode resultar em multas de até R$ 50 milhões
- **Solução**: Migrar para `southamerica-east1` (São Paulo, Brasil)

---

## 📍 Disponibilidade de GPU

### GPUs Disponíveis em `southamerica-east1`

| Zona | GPU T4 | Status |
|------|--------|--------|
| `southamerica-east1-a` | ✅ Disponível | **Recomendado** |
| `southamerica-east1-b` | ❌ **Não disponível** | Não usar |
| `southamerica-east1-c` | ✅ Disponível | Alternativa |

**⚠️ Importante**: `southamerica-east1-b` **não tem GPU disponível**. Use `-a` ou `-c`.

---

## 🔄 Estratégia de Migração

### Opção 1: Migração Completa (Recomendado)

1. Criar nova VM em `southamerica-east1-a` ou `southamerica-east1-c`
2. Configurar vLLM com Llama 3.1 8B
3. Atualizar `AI_CHAT_BASE_URL` no Supabase
4. Testar funcionamento
5. Parar e deletar VM antiga em `us-central1-b`

**Vantagens**:
- ✅ Zero downtime (migração gradual)
- ✅ Pode manter ambas rodando durante transição
- ✅ Rollback fácil se houver problemas

### Opção 2: Alta Disponibilidade (Futuro)

1. Criar nova VM em `southamerica-east1-a`
2. Manter VM em `us-central1-b` como fallback
3. Configurar Load Balancer para rotear entre as duas

**Vantagens**:
- ✅ Redundância geográfica
- ✅ Fallback automático
- ⚠️ Custo duplicado

---

## 📋 Passo a Passo: Migração Completa

### Passo 1: Escolher Zona

```bash
# Escolha uma das opções abaixo
ZONE="southamerica-east1-a"  # Recomendado
# OU
ZONE="southamerica-east1-c"  # Alternativa
```

### Passo 2: Verificar Quota de GPU

```bash
# Verificar quota atual
gcloud compute project-info describe --project=arcane-atom-480020-f6 \
  --format="get(quotas[metric=GPUS_ALL_REGIONS].limit)"

# Se necessário, solicitar aumento de quota
# Acesse: https://console.cloud.google.com/iam-admin/quotas
```

### Passo 3: Criar Nova VM em `southamerica-east1`

```bash
# Definir variáveis
ZONE="southamerica-east1-a"  # ou southamerica-east1-c
PROJECT_ID="arcane-atom-480020-f6"

# Criar VM com GPU T4
gcloud compute instances create llm-chat-gpu-br \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --machine-type=n1-standard-4 \
  --accelerator="type=nvidia-tesla-t4,count=1" \
  --preemptible \
  --maintenance-policy=TERMINATE \
  --restart-on-failure \
  --boot-disk-size=200GB \
  --boot-disk-type=pd-ssd \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=llm-chat-gpu

# Aguardar VM iniciar (pode levar 1-2 minutos)
sleep 60

# Obter IP externo
EXTERNAL_IP=$(gcloud compute instances describe llm-chat-gpu-br \
  --zone=$ZONE \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

echo "Nova VM criada com IP: $EXTERNAL_IP"
```

### Passo 4: Configurar Firewall

```bash
# Verificar se regra já existe
gcloud compute firewall-rules list --filter="name~allow-vllm"

# Criar regra de firewall (se não existir)
gcloud compute firewall-rules create allow-vllm-8000-br \
  --allow tcp:8000 \
  --source-ranges 0.0.0.0/0 \
  --target-tags llm-chat-gpu \
  --description "Allow vLLM on port 8000 (LGPD - Brazil)"
```

### Passo 5: Instalar Docker e NVIDIA Drivers

```bash
# Conectar na nova VM
gcloud compute ssh llm-chat-gpu-br --zone=$ZONE

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Instalar NVIDIA Drivers
sudo ubuntu-drivers autoinstall
sudo reboot

# Após reiniciar, verificar drivers
nvidia-smi
```

### Passo 6: Instalar NVIDIA Container Toolkit

```bash
# Conectar novamente após reboot
gcloud compute ssh llm-chat-gpu-br --zone=$ZONE

# Instalar NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker

# Testar GPU no Docker
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

### Passo 7: Configurar vLLM com Llama 3.1 8B

```bash
# Obter token do Hugging Face (se ainda não tiver)
# Acesse: https://huggingface.co/settings/tokens
# Crie um token e substitua abaixo

HF_TOKEN="hf_xxxxxxxxxxxxx"  # Substitua pelo seu token

# Criar container vLLM com Llama 3.1 8B quantizado
docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  --shm-size=8g \
  -e HF_TOKEN=$HF_TOKEN \
  vllm/vllm-openai:latest \
  TheBloke/Llama-3.1-8B-Instruct-AWQ \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --max-model-len 131072 \
  --gpu-memory-utilization 0.9 \
  --enable-auto-tool-choice \
  --tool-call-parser openai

# Verificar logs (aguardar carregamento - pode levar 5-10 min)
docker logs -f vllm-chat
```

### Passo 8: Testar Nova VM

```bash
# Testar API localmente (dentro da VM)
curl http://localhost:8000/v1/models

# Testar API externamente (do seu computador)
curl http://$EXTERNAL_IP:8000/v1/models

# Testar chat
curl -X POST http://$EXTERNAL_IP:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "TheBloke/Llama-3.1-8B-Instruct-AWQ",
    "messages": [{"role": "user", "content": "Olá! Você está funcionando?"}],
    "max_tokens": 100
  }'
```

### Passo 9: Atualizar Supabase

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx)
2. Vá em **Project Settings** > **Edge Functions** > **Secrets**
3. Atualize:
   - **AI_CHAT_BASE_URL**: `http://$EXTERNAL_IP:8000/v1` (substitua pelo IP da nova VM)
   - **AI_CHAT_MODEL**: `TheBloke/Llama-3.1-8B-Instruct-AWQ`

### Passo 10: Testar no App/Web

1. Aguardar 1-2 minutos (para Supabase recarregar secrets)
2. Testar chat no app/web
3. Verificar logs do `ai-orchestrator` no Supabase
4. Confirmar que está usando a nova VM (verificar IP nos logs)

### Passo 11: Parar VM Antiga (Opcional)

**⚠️ Só faça isso após confirmar que a nova VM está funcionando perfeitamente!**

```bash
# Parar VM antiga (não deletar ainda - manter como backup por alguns dias)
gcloud compute instances stop llm-chat-gpu --zone=us-central1-b

# Após alguns dias de testes, se tudo estiver OK, deletar:
# gcloud compute instances delete llm-chat-gpu --zone=us-central1-b
```

---

## ✅ Checklist de Migração

- [ ] Nova VM criada em `southamerica-east1-a` ou `southamerica-east1-c`
- [ ] Docker e NVIDIA drivers instalados
- [ ] vLLM rodando com Llama 3.1 8B
- [ ] Firewall configurado (porta 8000)
- [ ] API testada (local e externa)
- [ ] `AI_CHAT_BASE_URL` atualizado no Supabase
- [ ] Chat testado no app/web
- [ ] Logs verificados (confirmar uso da nova VM)
- [ ] VM antiga parada (após confirmação)

---

## 🔍 Verificação de Conformidade LGPD

### Como Confirmar que Está em `southamerica-east1`

```bash
# Verificar zona da VM
gcloud compute instances describe llm-chat-gpu-br \
  --zone=southamerica-east1-a \
  --format="get(zone)"

# Deve retornar: projects/arcane-atom-480020-f6/zones/southamerica-east1-a
```

### Logs de Auditoria

Mantenha logs de:
- Data/hora da migração
- IP da nova VM
- Confirmação de funcionamento
- Data de parada da VM antiga

---

## 💰 Impacto de Custos

### Custo Mensal Estimado

| Item | Custo (USD) | Custo (BRL) |
|------|-------------|-------------|
| VM n1-standard-4 (preemptible) | ~$50 | ~R$ 250 |
| GPU T4 (preemptible) | ~$200 | ~R$ 1.000 |
| Disco 200GB SSD | ~$40 | ~R$ 200 |
| **Total** | **~$290** | **~R$ 1.450** |

**Nota**: Valores aproximados. Preemptible VMs têm desconto de ~80%.

---

## 🚨 Troubleshooting

### Erro: "ZONE_RESOURCE_POOL_EXHAUSTED"

**Causa**: Zona sem recursos disponíveis.

**Solução**: Tentar outra zona (`southamerica-east1-c` se estava usando `-a`).

### Erro: "Quota 'GPUS_ALL_REGIONS' exceeded"

**Causa**: Quota de GPU insuficiente.

**Solução**: Solicitar aumento de quota no GCP Console.

### vLLM não está acessível externamente

**Causa**: Firewall não configurado ou VM sem IP externo.

**Solução**: 
1. Verificar regra de firewall: `gcloud compute firewall-rules list`
2. Verificar IP externo: `gcloud compute instances describe llm-chat-gpu-br --zone=$ZONE`

---

## 📚 Referências

- [LGPD - Lei Geral de Proteção de Dados](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [GCP Regions and Zones](https://cloud.google.com/compute/docs/regions-zones)
- [vLLM Documentation](https://docs.vllm.ai/)

---

**Última atualização:** 2026-01-28
