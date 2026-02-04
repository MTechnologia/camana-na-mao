# Deploy n8n no Cloud Run (Auto-scaling)

**Data:** 2026-01-28  
**Objetivo:** Deploy do n8n no Cloud Run com escala automática para Câmara na Mão

---

## 🎯 Objetivos

- ✅ Deploy n8n no Cloud Run (southamerica-east1 - LGPD)
- ✅ Escala automática (1-10 instâncias)
- ✅ HTTPS automático
- ✅ Integração com Supabase
- ✅ Acesso direto às VMs de LLM via VPC

---

## 📋 Pré-requisitos

- [ ] GCP Project configurado (`arcane-atom-480020-f6`)
- [ ] `gcloud` CLI instalado e autenticado
- [ ] Permissões: Cloud Run Admin, Service Account User
- [ ] Domínio (opcional, mas recomendado para HTTPS)

---

## 🚀 Passo a Passo: Deploy Completo

### Passo 1: Habilitar APIs Necessárias

```bash
# Habilitar Cloud Run API
gcloud services enable run.googleapis.com

# Habilitar Cloud Build API (se quiser usar build)
gcloud services enable cloudbuild.googleapis.com

# Habilitar Artifact Registry (para imagens Docker)
gcloud services enable artifactregistry.googleapis.com
```

### Passo 2: Configurar Variáveis

```bash
# Definir variáveis
PROJECT_ID="arcane-atom-480020-f6"
REGION="southamerica-east1"
SERVICE_NAME="n8n-worker"
ADMIN_USER="admin"
ADMIN_PASSWORD="SUA_SENHA_FORTE_AQUI"  # ⚠️ ALTERE ISSO!

# Gerar senha forte (opcional)
# No PowerShell:
# -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

### Passo 3: Criar Secret Manager (Senha Segura)

```bash
# Criar secret para senha do admin
echo -n "$ADMIN_PASSWORD" | gcloud secrets create n8n-admin-password \
  --data-file=- \
  --replication-policy="automatic"

# Dar permissão ao Cloud Run para acessar o secret
gcloud secrets add-iam-policy-binding n8n-admin-password \
  --member="serviceAccount:$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Passo 4: Deploy no Cloud Run

```bash
# Deploy n8n no Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image=n8nio/n8n:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=1 \
  --max-instances=10 \
  --timeout=3600 \
  --concurrency=80 \
  --port=5678 \
  --set-env-vars="N8N_BASIC_AUTH_ACTIVE=true,N8N_BASIC_AUTH_USER=$ADMIN_USER" \
  --set-secrets="N8N_BASIC_AUTH_PASSWORD=n8n-admin-password:latest" \
  --set-env-vars="N8N_HOST=0.0.0.0,N8N_PORT=5678,N8N_PROTOCOL=https" \
  --set-env-vars="N8N_METRICS=true" \
  --vpc-connector=default \
  --vpc-egress=all-traffic
```

**Explicação dos parâmetros:**
- `--min-instances=1`: Sempre 1 instância rodando (evita cold start)
- `--max-instances=10`: Máximo de 10 instâncias (ajustável)
- `--concurrency=80`: 80 requisições simultâneas por instância
- `--timeout=3600`: Timeout de 1 hora (para workflows longos)
- `--vpc-connector`: Acesso à VPC interna (para comunicação com VMs de LLM)

### Passo 5: Obter URL do Serviço

```bash
# Obter URL do serviço
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format="value(status.url)")

echo "n8n está disponível em: $SERVICE_URL"
```

### Passo 6: Configurar Domínio Personalizado (Opcional mas Recomendado)

```bash
# Mapear domínio personalizado
gcloud run domain-mappings create \
  --service=$SERVICE_NAME \
  --domain=seu-dominio.com.br \
  --region=$REGION

# Seguir instruções para configurar DNS
```

### Passo 7: Configurar Webhook URL no n8n

1. Acesse: `$SERVICE_URL` (ou seu domínio)
2. Faça login: `admin` / `$ADMIN_PASSWORD`
3. Vá em **Settings** > **Webhooks**
4. Configure:
   - **Webhook URL**: `$SERVICE_URL/webhook/` (ou seu domínio)
   - **Production URL**: `$SERVICE_URL` (ou seu domínio)

### Passo 8: Criar Workflow de Teste

1. Crie novo workflow no n8n
2. Adicione node **Webhook**
3. Configure:
   - **HTTP Method**: `POST`
   - **Path**: `camara-na-mao`
   - **Response Mode**: `Response Node`
4. Adicione node **Respond to Webhook**
5. Configure resposta: `{"status": "ok", "message": "Workflow recebido"}`
6. **Ative o workflow** (toggle no canto superior direito)
7. Copie a URL do webhook: `$SERVICE_URL/webhook/camara-na-mao`

### Passo 9: Configurar no Supabase

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx)
2. Vá em **Configurações** > **Integração N8N** (via UI Admin)
3. Configure:
   - **Webhook URL**: `$SERVICE_URL/webhook/camara-na-mao`
   - **Secret Key**: Gere uma chave forte (use `openssl rand -hex 32`)
   - **Ativar eventos**: Marque os eventos desejados
4. Clique em **Salvar**

### Passo 10: Testar Integração

```bash
# Testar webhook diretamente
curl -X POST "$SERVICE_URL/webhook/camara-na-mao" \
  -H "Content-Type: application/json" \
  -H "X-N8N-Secret: SUA_SECRET_KEY" \
  -d '{
    "event": "urban_report_created",
    "report_id": "test-123",
    "report_type": "urban"
  }'
```

---

## 🔧 Configurações Avançadas

### Ajustar Auto-scaling

```bash
# Atualizar configurações de escala
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --min-instances=2 \
  --max-instances=20 \
  --concurrency=100
```

### Configurar Métricas de Escala

```bash
# Ver métricas de uso
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format="value(status.conditions)"

# Ver logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" \
  --limit=50 \
  --format=json
```

### Configurar VPC Connector (Acesso às VMs de LLM)

```bash
# Criar VPC Connector (se não existir)
gcloud compute networks vpc-access connectors create n8n-connector \
  --region=$REGION \
  --subnet-project=$PROJECT_ID \
  --subnet=default \
  --min-instances=2 \
  --max-instances=10

# Atualizar serviço para usar VPC Connector
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --vpc-connector=n8n-connector \
  --vpc-egress=all-traffic
```

**Agora o n8n pode acessar VMs de LLM via IP interno:**
```javascript
// No workflow n8n, use IP interno da VM llm-chat-gpu
const vllmUrl = "http://10.158.0.X:8000/v1/chat/completions";
```

### Configurar Variáveis de Ambiente Adicionais

```bash
# Adicionar variáveis de ambiente
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --update-env-vars="N8N_ENCRYPTION_KEY=SUA_CHAVE_DE_32_CHARS,N8N_USER_FOLDER=/home/node/.n8n"
```

### Configurar Volume Persistente (Workflows e Dados)

**⚠️ Cloud Run não suporta volumes persistentes nativamente.**

**Soluções:**
1. **Cloud SQL**: Para banco de dados (recomendado para produção)
2. **Cloud Storage**: Para arquivos grandes
3. **Firestore**: Para dados estruturados

**Exemplo com Cloud SQL:**
```bash
# Criar instância Cloud SQL (PostgreSQL)
gcloud sql instances create n8n-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION

# Conectar Cloud Run ao Cloud SQL
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --add-cloudsql-instances=$PROJECT_ID:$REGION:n8n-db \
  --set-env-vars="DB_TYPE=postgresdb,DB_POSTGRESDB_HOST=/cloudsql/$PROJECT_ID:$REGION:n8n-db,DB_POSTGRESDB_DATABASE=n8n,DB_POSTGRESDB_USER=n8n,DB_POSTGRESDB_PASSWORD=senha"
```

---

## 📊 Monitoramento

### Ver Métricas de Escala

```bash
# Ver número de instâncias ativas
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format="value(status.conditions)"

# Ver uso de recursos
gcloud monitoring time-series list \
  --filter='resource.type="cloud_run_revision" AND resource.labels.service_name="'$SERVICE_NAME'"' \
  --limit=10
```

### Configurar Alertas

```bash
# Criar alerta para alta latência
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="n8n High Latency" \
  --condition-display-name="Latency > 5s" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s
```

---

## 💰 Estimativa de Custos

### Cloud Run (southamerica-east1)

| Item | Custo |
|------|-------|
| **Mínimo (1 instância sempre rodando)** | ~$30-40/mês |
| **CPU (2 vCPU)** | ~$0.00002400/vCPU-segundo |
| **Memória (2GB)** | ~$0.00000250/GB-segundo |
| **Requisições** | Primeiras 2M grátis, depois $0.40/milhão |
| **Tráfego de saída** | Primeiros 1GB grátis, depois $0.12/GB |

**Estimativa mensal (volume médio):**
- 1 instância mínima: ~$30-40
- Uso adicional: ~$20-50
- **Total**: ~$50-90/mês

**Comparado com n8n Cloud:**
- n8n Cloud: ~$200-300/mês (mesmo volume)
- **Economia**: ~$150-210/mês (60-70%)

---

## 🔒 Segurança

### Autenticação Básica

✅ Já configurado no deploy (via `N8N_BASIC_AUTH_ACTIVE=true`)

### HTTPS

✅ Automático no Cloud Run (todos os serviços têm HTTPS)

### Secret Management

✅ Senha do admin em Secret Manager (não exposta)

### VPC Isolation

✅ Acesso às VMs de LLM via VPC interna (não exposta publicamente)

### IAM e Permissões

```bash
# Remover acesso público (se necessário)
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --no-allow-unauthenticated

# Adicionar permissão para usuário específico
gcloud run services add-iam-policy-binding $SERVICE_NAME \
  --region=$REGION \
  --member="user:seu-email@exemplo.com" \
  --role="roles/run.invoker"
```

---

## 🚨 Troubleshooting

### Erro: "Container failed to start"

**Causa**: Variáveis de ambiente incorretas ou imagem não encontrada.

**Solução**:
```bash
# Verificar logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" \
  --limit=50

# Verificar variáveis de ambiente
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format="value(spec.template.spec.containers[0].env)"
```

### Erro: "Cold start muito lento"

**Causa**: `min-instances=0` (instância inicia do zero).

**Solução**:
```bash
# Aumentar min-instances
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --min-instances=1
```

### Erro: "Cannot connect to VPC"

**Causa**: VPC Connector não configurado ou incorreto.

**Solução**:
```bash
# Verificar VPC Connector
gcloud compute networks vpc-access connectors list --region=$REGION

# Recriar se necessário
gcloud compute networks vpc-access connectors create n8n-connector \
  --region=$REGION \
  --subnet=default
```

---

## ✅ Checklist de Deploy

- [ ] APIs habilitadas (Cloud Run, Cloud Build, Artifact Registry)
- [ ] Secret Manager configurado (senha do admin)
- [ ] Cloud Run deployado com auto-scaling
- [ ] URL do serviço obtida
- [ ] Domínio personalizado configurado (opcional)
- [ ] Workflow de teste criado no n8n
- [ ] Webhook URL configurada no Supabase
- [ ] Integração testada
- [ ] VPC Connector configurado (para acesso às VMs de LLM)
- [ ] Monitoramento configurado
- [ ] Alertas configurados (opcional)

---

## 📚 Próximos Passos

1. **Criar workflows de produção** no n8n
2. **Configurar backup** (Cloud SQL ou Cloud Storage)
3. **Configurar monitoramento avançado** (Cloud Monitoring)
4. **Otimizar auto-scaling** baseado em métricas reais
5. **Configurar CI/CD** (opcional, para atualizações automáticas)

---

**Última atualização:** 2026-01-28
