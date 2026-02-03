# n8n Cloud Run - Deploy Concluído ✅

**Data:** 2026-01-28  
**Status:** Deploy realizado com sucesso

---

## 📋 Informações do Serviço

### URL do Serviço
```
https://n8n-worker-767943602990.southamerica-east1.run.app
```

### Credenciais de Acesso
- **Usuário**: `admin`
- **Senha**: `u9In3KObaZ5wGlLzBgPt0VoDCAcje1Ym`
- **⚠️ IMPORTANTE**: Guarde esta senha em local seguro!

### Configuração
- **Região**: `southamerica-east1` (Brasil - LGPD ✅)
- **Memória**: 2GB
- **CPU**: 2 vCPUs
- **Instâncias mínimas**: 1 (sempre rodando)
- **Instâncias máximas**: 10 (auto-scaling)
- **Concorrência**: 80 requisições por instância
- **Timeout**: 3600 segundos (1 hora)

---

## 🚀 Próximos Passos

### 1. Acessar n8n

1. Abra: `https://n8n-worker-767943602990.southamerica-east1.run.app`
2. Faça login:
   - **Usuário**: `admin`
   - **Senha**: `u9In3KObaZ5wGlLzBgPt0VoDCAcje1Ym`

### 2. Criar Workflow de Teste

1. Clique em **"Add workflow"**
2. Adicione node **"Webhook"**
3. Configure:
   - **HTTP Method**: `POST`
   - **Path**: `camara-na-mao`
   - **Response Mode**: `Response Node`
4. Adicione node **"Respond to Webhook"**
5. Configure resposta: `{"status": "ok"}`
6. **Ative o workflow** (toggle no canto superior direito)
7. Copie a URL do webhook: `https://n8n-worker-767943602990.southamerica-east1.run.app/webhook/camara-na-mao`

### 3. Configurar no Supabase

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx)
2. Vá em **Configurações** > **Integração N8N** (via UI Admin)
3. Configure:
   - **Webhook URL**: `https://n8n-worker-767943602990.southamerica-east1.run.app/webhook/camara-na-mao`
   - **Secret Key**: Gere uma chave forte:
     ```bash
     # No PowerShell:
     -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
     ```
   - **Ativar eventos**: Marque os eventos desejados
4. Clique em **Salvar**

### 4. Testar Integração

```bash
# Testar webhook diretamente
curl -X POST "https://n8n-worker-767943602990.southamerica-east1.run.app/webhook/camara-na-mao" \
  -H "Content-Type: application/json" \
  -H "X-N8N-Secret: SUA_SECRET_KEY" \
  -d '{
    "event": "urban_report_created",
    "report_id": "test-123",
    "report_type": "urban"
  }'
```

---

## 🔧 Comandos Úteis

### Ver Logs
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=n8n-worker" \
  --limit=50 \
  --format=json
```

### Ver Status do Serviço
```bash
gcloud run services describe n8n-worker \
  --region=southamerica-east1 \
  --format="value(status.conditions)"
```

### Atualizar Configuração
```bash
# Ajustar auto-scaling
gcloud run services update n8n-worker \
  --region=southamerica-east1 \
  --min-instances=2 \
  --max-instances=20
```

### Ver Métricas
```bash
# Ver número de instâncias
gcloud run services describe n8n-worker \
  --region=southamerica-east1 \
  --format="value(status.conditions)"
```

---

## 💰 Custos Estimados

- **Mínimo (1 instância sempre rodando)**: ~$30-40/mês
- **Uso adicional**: ~$20-50/mês
- **Total estimado**: ~$50-90/mês

**Comparado com n8n Cloud**: Economia de ~$150-210/mês (60-70%)

---

## 🔒 Segurança

✅ **HTTPS**: Automático (todos os serviços Cloud Run têm HTTPS)  
✅ **Autenticação**: Básica configurada (admin/senha)  
✅ **Secret Manager**: Senha armazenada de forma segura  
✅ **LGPD**: Dados processados no Brasil (southamerica-east1)

---

## 📚 Documentação

- Guia completo: `docs/DEPLOY_N8N_CLOUD_RUN.md`
- Comparativo Cloud vs Self-hosted: `docs/N8N_CLOUD_VS_SELF_HOSTED_GCP.md`
- Configuração passo a passo: `docs/GUIA_CONFIGURACAO_N8N_PASSO_A_PASSO.md`

---

**Última atualização:** 2026-01-28
