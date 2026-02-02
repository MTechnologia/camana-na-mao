# Como Corrigir IP da VM Preemptible

**Data:** 2026-02-02  
**Problema:** IP da VM muda toda vez que ela é reiniciada (preemptible)  
**Solução:** Atualizar secret no Supabase ou configurar IP estático

---

## 🔍 Problema Identificado

**IP no Supabase:** `34.122.116.56` (antigo)  
**IP Atual da VM:** `34.71.221.107` (novo)

A VM é **preemptible**, então o IP externo muda toda vez que ela é reiniciada.

---

## ✅ Solução Imediata: Atualizar IP no Supabase

### Passo 1: Verificar IP Atual da VM

```bash
gcloud compute instances describe llm-chat-gpu-l4 \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

**Ou verificar no GCP Console:**
- Compute Engine > VM instances > `llm-chat-gpu-l4`
- Ver coluna "IP externo"

**IP Atual:** `34.71.221.107`

---

### Passo 2: Atualizar Secret no Supabase

1. **Acesse:** https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx
2. **Vá em:** **Settings** > **Edge Functions** > **Secrets**
3. **Procure por:** `AI_CHAT_BASE_URL` ou `AI_BASE_URL`
4. **Atualize o valor para:**
   ```
   http://34.71.221.107:8000
   ```
   **OU** (se tiver `/v1` no final):
   ```
   http://34.71.221.107:8000/v1
   ```
5. **Clique em:** **Save** ou **Update**

---

### Passo 3: Aguardar e Testar

1. **Aguarde 1-2 minutos** para o Supabase recarregar
2. **Teste no chat** do APK
3. **Verifique logs do Supabase:**
   - Edge Functions > **ai-orchestrator** > **Logs**
   - Deve mostrar: `Calling AI API: http://34.71.221.107:8000`

---

## 🔧 Solução Permanente: IP Estático

Para evitar ter que atualizar o IP toda vez, configure um **IP estático** no GCP:

### Passo 1: Reservar IP Estático

```bash
# Criar IP estático
gcloud compute addresses create llm-chat-gpu-l4-ip \
  --region=us-central1

# Ver IP reservado
gcloud compute addresses describe llm-chat-gpu-l4-ip \
  --region=us-central1
```

**Anote o IP retornado** (exemplo: `34.71.221.107`)

---

### Passo 2: Atribuir IP Estático à VM

```bash
# Parar VM (se estiver rodando)
gcloud compute instances stop llm-chat-gpu-l4 --zone=us-central1-a

# Atribuir IP estático
gcloud compute instances delete-access-config llm-chat-gpu-l4 \
  --zone=us-central1-a \
  --access-config-name="External NAT"

gcloud compute instances add-access-config llm-chat-gpu-l4 \
  --zone=us-central1-a \
  --access-config-name="External NAT" \
  --address=34.71.221.107

# Iniciar VM
gcloud compute instances start llm-chat-gpu-l4 --zone=us-central1-a
```

---

### Passo 3: Atualizar Supabase com IP Estático

1. **Atualizar secret no Supabase** com o IP estático
2. **Agora o IP não mudará mais**, mesmo se a VM for reiniciada

---

## 📋 Script Automático (Opcional)

Crie um script para atualizar automaticamente:

```bash
#!/bin/bash
# update-vm-ip.sh

# Obter IP atual da VM
CURRENT_IP=$(gcloud compute instances describe llm-chat-gpu-l4 \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

echo "IP atual da VM: $CURRENT_IP"

# Atualizar no Supabase (via API ou manualmente)
echo "Atualize manualmente no Supabase Dashboard:"
echo "Settings > Edge Functions > Secrets > AI_CHAT_BASE_URL"
echo "Novo valor: http://$CURRENT_IP:8000"
```

---

## ⚠️ Observações Importantes

1. **IP Estático tem custo:** ~$0.004/hora (~$3/mês)
2. **IP Estático é regional:** Deve estar na mesma região da VM
3. **VM Preemptible:** Pode ser interrompida, mas IP não muda
4. **Backup:** Sempre anote o IP atual antes de reiniciar

---

## 🔄 Processo Quando VM Reiniciar

### Se tiver IP Estático:
- ✅ IP não muda
- ✅ Supabase continua funcionando
- ✅ Nenhuma ação necessária

### Se NÃO tiver IP Estático:
1. Verificar novo IP da VM
2. Atualizar secret no Supabase
3. Aguardar 1-2 minutos
4. Testar

---

## 📝 Checklist

- [ ] Verificar IP atual da VM
- [ ] Atualizar secret no Supabase
- [ ] Aguardar 1-2 minutos
- [ ] Testar no chat
- [ ] Verificar logs do Supabase
- [ ] (Opcional) Configurar IP estático

---

**Última atualização:** 2026-02-02
