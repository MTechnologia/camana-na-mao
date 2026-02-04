# Verificação Alternativa do vLLM (Quando SSH Falha)

**Data:** 2026-01-27  
**Problema:** SSH está falhando, mas precisamos verificar o status do vLLM

---

## Método 1: Verificar via Serial Console

Se o SSH não estiver funcionando, você pode verificar os logs via Serial Console:

```bash
# Ver últimas linhas do serial console
gcloud compute instances get-serial-port-output llm-chat-gpu \
  --zone=us-central1-b \
  --port=1 | tail -50
```

Procure por:
- `docker ps` output
- `vllm` logs
- Mensagens de erro

---

## Método 2: Verificar Status da VM e IP

```bash
# Ver status da VM
gcloud compute instances describe llm-chat-gpu \
  --zone=us-central1-b \
  --format="get(status)"

# Ver IP externo
gcloud compute instances describe llm-chat-gpu \
  --zone=us-central1-b \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

---

## Método 3: Testar API Diretamente

```powershell
# No PowerShell
Test-NetConnection -ComputerName 34.41.3.173 -Port 8000

# Se a porta estiver aberta, testar a API
Invoke-WebRequest -Uri "http://34.41.3.173:8000/v1/models" -UseBasicParsing
```

---

## Método 4: Verificar Firewall

```bash
# Listar regras de firewall
gcloud compute firewall-rules list --filter="allowed.ports:8000"

# Ver detalhes de uma regra específica
gcloud compute firewall-rules describe allow-vllm-8000
```

---

## Método 5: Reiniciar Container via Serial Console (Último Recurso)

Se precisar reiniciar o container sem SSH:

1. **Criar script de inicialização na VM:**
   - Use Cloud Init ou startup script
   - Ou crie um script que rode automaticamente

2. **Ou reinicie a VM:**
   ```bash
   gcloud compute instances reset llm-chat-gpu --zone=us-central1-b
   ```

---

## Troubleshooting SSH

Se o SSH continuar falhando:

### Opção 1: Usar IAP Tunneling

```bash
gcloud compute ssh llm-chat-gpu \
  --zone=us-central1-b \
  --tunnel-through-iap
```

### Opção 2: Verificar Configuração de Rede

```bash
# Verificar se a VM tem IP externo
gcloud compute instances describe llm-chat-gpu \
  --zone=us-central1-b \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"

# Se não tiver, adicionar IP externo
gcloud compute instances add-access-config llm-chat-gpu \
  --zone=us-central1-b \
  --access-config-name="External NAT"
```

### Opção 3: Verificar Regras de Firewall SSH

```bash
# Verificar se porta 22 está aberta
gcloud compute firewall-rules list --filter="allowed.ports:22"
```

---

## Verificação Rápida do Status

Execute este comando para verificar tudo de uma vez:

```bash
# Status da VM
echo "=== VM Status ==="
gcloud compute instances describe llm-chat-gpu \
  --zone=us-central1-b \
  --format="get(status)"

# IP Externo
echo "=== IP Externo ==="
gcloud compute instances describe llm-chat-gpu \
  --zone=us-central1-b \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"

# Firewall
echo "=== Firewall Rules ==="
gcloud compute firewall-rules list --filter="allowed.ports:8000"

# Teste de Conexão
echo "=== Teste de Conexão ==="
Test-NetConnection -ComputerName 34.41.3.173 -Port 8000
```

---

**Última atualização:** 2026-01-27
