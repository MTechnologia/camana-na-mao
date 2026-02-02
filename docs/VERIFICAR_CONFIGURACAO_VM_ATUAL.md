# Como Verificar Qual VM Está Configurada no Supabase

**Data:** 2026-01-31  
**Objetivo:** Verificar qual VM e IP estão configurados no Supabase após iniciar a VM

---

## 🔍 Passo 1: Verificar Qual VM Você Iniciou

Na imagem do GCP, você pode ter iniciado:
- `llm-chat-gpu` (zona: `us-central1-b`)
- `llm-chat-gpu-l4` (zona: `us-central1-a`)

---

## 🔍 Passo 2: Verificar IP Atual da VM

### Se iniciou `llm-chat-gpu`:
```bash
gcloud compute instances describe llm-chat-gpu \
  --zone=us-central1-b \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

### Se iniciou `llm-chat-gpu-l4`:
```bash
gcloud compute instances describe llm-chat-gpu-l4 \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

**Anote o IP retornado** (exemplo: `34.71.221.107`)

---

## 🔍 Passo 3: Verificar Configuração no Supabase

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto (`vjzkzsczlbtmrzewffdx`)
3. Vá em **Project Settings** > **Edge Functions** > **Secrets**
4. Procure por `AI_CHAT_BASE_URL` ou `AI_BASE_URL`
5. Verifique o valor configurado

**Formato esperado:** `http://[IP]:8000/v1`

---

## ✅ Passo 4: Comparar e Atualizar se Necessário

### Se o IP no Supabase NÃO corresponde ao IP atual da VM:

1. **Atualize o secret no Supabase:**
   - Clique em `AI_CHAT_BASE_URL` (ou `AI_BASE_URL`)
   - Edite o valor para: `http://[IP_ATUAL]:8000/v1`
   - Substitua `[IP_ATUAL]` pelo IP que você obteve no Passo 2
   - Clique em **Save**

2. **Aguarde 1-2 minutos** para o Supabase recarregar

3. **Teste novamente** no chat

---

## 🔍 Passo 5: Verificar nos Logs do Supabase

Após atualizar, verifique nos logs:

1. No Supabase Dashboard: **Edge Functions** > **ai-orchestrator** > **Logs**
2. Procure por:
   - ✅ `[ai-orchestrator] Using AI provider: http://[IP]:8000/v1`
   - ✅ `[ai-orchestrator] Calling AI API: http://[IP]:8000/v1/chat/completions`

O IP nos logs deve corresponder ao IP atual da VM.

---

## 🐛 Troubleshooting

### Erro: "Connection refused" ou timeout continua

**Possíveis causas:**
1. **vLLM ainda não inicializou** na VM
   - Aguarde 2-3 minutos após iniciar a VM
   - O vLLM precisa carregar o modelo na GPU

2. **Firewall bloqueando**
   - Verifique se a porta 8000 está aberta
   - Verifique as regras de firewall no GCP

3. **IP mudou** (VMs preemptible)
   - VMs preemptible podem ter IPs diferentes a cada reinicialização
   - Verifique o IP atual novamente

### Verificar se vLLM está rodando na VM

**Para `llm-chat-gpu`:**
```bash
gcloud compute ssh llm-chat-gpu --zone=us-central1-b \
  --command="docker ps | grep vllm"
```

**Para `llm-chat-gpu-l4`:**
```bash
gcloud compute ssh llm-chat-gpu-l4 --zone=us-central1-a \
  --command="docker ps | grep vllm"
```

**Deve retornar algo como:**
```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS   PORTS   NAMES
abc123def456   vllm      ...       ...       Up ...   0.0.0.0:8000->8000/tcp   vllm-chat
```

---

## 📝 Nota Importante

**IPs podem mudar** se a VM for preemptible. Para produção, considere:
- Configurar IP estático no GCP
- Usar Load Balancer
- Ou criar um script para atualizar automaticamente

**⚠️ PROBLEMA COMUM:** Se o IP mudou, o Supabase continuará usando o IP antigo até você atualizar o secret.

**Solução rápida:**
1. Verificar IP atual: `gcloud compute instances describe llm-chat-gpu-l4 --zone=us-central1-a --format="get(networkInterfaces[0].accessConfigs[0].natIP)"`
2. Atualizar no Supabase: Settings > Edge Functions > Secrets > `AI_CHAT_BASE_URL`
3. Ver guia completo: `docs/CORRIGIR_IP_VM_PREEMPTIBLE.md`

---

**Última atualização:** 2026-02-02
