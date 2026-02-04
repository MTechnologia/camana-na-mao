# Como Verificar Logs e Atividades do n8n

**Data:** 2026-02-02  
**Objetivo:** Guia completo para monitorar execuções, logs e chamadas do n8n

---

## 🔍 Identificar Qual n8n Está Sendo Usado

O projeto pode ter n8n em dois lugares:

1. **n8n Cloud** (`felipemtechn8n.app.n8n.cloud`)
2. **n8n no Cloud Run** (`n8n-worker-767943602990.southamerica-east1.run.app`)

### Verificar Qual Está Configurado

**No Supabase:**
1. Acesse: https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx
2. Vá em: **Settings** > **Edge Functions** > **Secrets**
3. Procure por: `N8N_WEBHOOK_URL` ou similar
4. Veja qual URL está configurada

**Ou verificar no código:**
```bash
# Verificar função notify-n8n
grep -r "n8n" supabase/functions/notify-n8n/
```

---

## 📊 Método 1: Via Interface Web do n8n

### Se for n8n Cloud

1. **Acesse:** https://felipemtechn8n.app.n8n.cloud
2. **Faça login** com suas credenciais
3. **Vá em "Executions"** (Execuções) no menu lateral
4. **Visualize:**
   - Todas as execuções de workflows
   - Status (Success, Error, Running)
   - Tempo de execução
   - Dados de entrada/saída
   - Logs detalhados de cada node

### Se for n8n no Cloud Run

1. **Acesse:** https://n8n-worker-767943602990.southamerica-east1.run.app
2. **Faça login:**
   - **Usuário:** `admin`
   - **Senha:** `u9In3KObaZ5wGlLzBgPt0VoDCAcje1Ym`
3. **Vá em "Executions"** (Execuções)
4. **Visualize:** Mesmas informações do n8n Cloud

---

## 📋 Método 2: Via Logs do Cloud Run (n8n no GCP)

### 2.1 Via Console do GCP

1. **Acesse:** https://console.cloud.google.com
2. **Vá em:** **Cloud Run** > **Services**
3. **Procure por:** `n8n-worker` ou `n8n`
4. **Clique no serviço**
5. **Vá em:** **Logs** (aba no topo)
6. **Visualize:**
   - Logs em tempo real
   - Filtros por nível (Error, Warning, Info)
   - Busca por texto
   - Período de tempo

**URL Direta:**
```
https://console.cloud.google.com/run/detail/southamerica-east1/n8n-worker/logs?project=SEU_PROJECT_ID
```

---

### 2.2 Via gcloud CLI

```bash
# Ver logs em tempo real
gcloud run services logs read n8n-worker \
  --region=southamerica-east1 \
  --follow

# Ver últimos 100 logs
gcloud run services logs read n8n-worker \
  --region=southamerica-east1 \
  --limit=100

# Filtrar por nível (erro)
gcloud run services logs read n8n-worker \
  --region=southamerica-east1 \
  --level=error \
  --limit=100

# Filtrar por texto
gcloud run services logs read n8n-worker \
  --region=southamerica-east1 \
  --grep="webhook\|error\|failed" \
  --limit=100

# Logs de um período específico
gcloud run services logs read n8n-worker \
  --region=southamerica-east1 \
  --since="2026-02-02T00:00:00Z" \
  --until="2026-02-02T23:59:59Z"
```

---

## 🔗 Método 3: Via API do n8n

### 3.1 Obter API Key

1. **Acesse o n8n** (Cloud ou Cloud Run)
2. **Vá em:** **Settings** > **API**
3. **Crie uma API Key** (se não tiver)
4. **Copie a chave**

### 3.2 Consultar Execuções via API

```bash
# Obter execuções recentes
curl -X GET "https://felipemtechn8n.app.n8n.cloud/api/v1/executions" \
  -H "X-N8N-API-KEY: SUA_API_KEY" \
  -H "Content-Type: application/json"

# Ou se for Cloud Run:
curl -X GET "https://n8n-worker-767943602990.southamerica-east1.run.app/api/v1/executions" \
  -H "X-N8N-API-KEY: SUA_API_KEY" \
  -H "Content-Type: application/json"
```

### 3.3 Obter Execução Específica

```bash
# Substitua EXECUTION_ID pelo ID da execução
curl -X GET "https://felipemtechn8n.app.n8n.cloud/api/v1/executions/EXECUTION_ID" \
  -H "X-N8N-API-KEY: SUA_API_KEY" \
  -H "Content-Type: application/json"
```

### 3.4 Obter Workflows

```bash
# Listar todos os workflows
curl -X GET "https://felipemtechn8n.app.n8n.cloud/api/v1/workflows" \
  -H "X-N8N-API-KEY: SUA_API_KEY" \
  -H "Content-Type: application/json"
```

---

## 📝 Método 4: Verificar Chamadas do Supabase para n8n

### 4.1 Logs da Edge Function `notify-n8n`

**Via Supabase Dashboard:**
1. Acesse: https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx
2. Vá em: **Edge Functions** > **notify-n8n** > **Logs**
3. Procure por:
   - `[notify-n8n] Webhook delivered successfully`
   - `[notify-n8n] Attempt X failed`
   - `[notify-n8n] Webhook URL:`

**Via CLI:**
```bash
# Ver logs da função notify-n8n
supabase functions logs notify-n8n --limit=50

# Filtrar por sucesso
supabase functions logs notify-n8n --grep="successfully" --limit=50

# Filtrar por erro
supabase functions logs notify-n8n --grep="failed\|error" --limit=50
```

### 4.2 Logs da Edge Function `n8n-callback`

**Verificar callbacks recebidos:**
```bash
# Ver logs da função n8n-callback
supabase functions logs n8n-callback --limit=50

# Filtrar por sucesso
supabase functions logs n8n-callback --grep="success\|received" --limit=50
```

---

## 🔍 Método 5: Verificar Webhooks Recebidos

### 5.1 No n8n (Interface Web)

1. **Acesse o n8n**
2. **Vá em:** **Executions**
3. **Filtre por:**
   - Workflow: Selecione o workflow que recebe webhooks
   - Status: Success, Error, etc.
4. **Clique em uma execução**
5. **Veja:**
   - Dados recebidos no webhook
   - Processamento em cada node
   - Resultado final

### 5.2 Verificar Webhook URL

**No workflow do n8n:**
1. Abra o workflow que recebe webhooks
2. Clique no node **Webhook**
3. Veja a URL do webhook (ex: `/webhook/camara-na-mao`)
4. URL completa: `https://[n8n-url]/webhook/camara-na-mao`

---

## 📊 Método 6: Monitoramento de Métricas

### 6.1 No Cloud Run (se n8n estiver no GCP)

1. **Acesse:** https://console.cloud.google.com/run
2. **Clique no serviço n8n**
3. **Vá em:** **Metrics** (aba no topo)
4. **Visualize:**
   - Requisições por segundo
   - Latência
   - Erros
   - Instâncias ativas

### 6.2 No n8n (Interface Web)

1. **Acesse o n8n**
2. **Vá em:** **Settings** > **Metrics** (se disponível)
3. **Visualize métricas de execução**

---

## 🐛 Troubleshooting

### Problema: Não vejo execuções no n8n

**Verificar:**
1. Workflow está ativado? (toggle no canto superior direito)
2. Webhook está configurado corretamente?
3. URL do webhook está correta no Supabase?
4. Secret key está correta?

### Problema: Webhook não está sendo recebido

**Verificar logs do Supabase:**
```bash
supabase functions logs notify-n8n --grep="webhook" --limit=20
```

**Verificar:**
- URL do webhook está correta?
- Firewall permite acesso?
- n8n está rodando?

### Problema: Execuções falhando

**Verificar:**
1. Logs do n8n (Interface Web > Executions > Clique na execução)
2. Logs do Cloud Run (se aplicável)
3. Verificar se vLLM está acessível
4. Verificar se callback URL está correta

---

## 📋 Checklist de Verificação

- [ ] Identificar qual n8n está sendo usado (Cloud ou Cloud Run)
- [ ] Acessar interface web do n8n
- [ ] Verificar execuções recentes
- [ ] Verificar logs do Cloud Run (se aplicável)
- [ ] Verificar logs do Supabase (`notify-n8n` e `n8n-callback`)
- [ ] Verificar webhook URL configurada
- [ ] Verificar métricas de performance

---

## 🔗 URLs Úteis

### n8n Cloud
- **Interface:** https://felipemtechn8n.app.n8n.cloud
- **API:** https://felipemtechn8n.app.n8n.cloud/api/v1

### n8n Cloud Run
- **Interface:** https://n8n-worker-767943602990.southamerica-east1.run.app
- **API:** https://n8n-worker-767943602990.southamerica-east1.run.app/api/v1
- **Logs GCP:** https://console.cloud.google.com/run/detail/southamerica-east1/n8n-worker/logs

### Supabase
- **Dashboard:** https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx
- **Edge Functions:** https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx/functions

---

## 📝 Comandos Rápidos

```bash
# 1. Ver logs do n8n no Cloud Run
gcloud run services logs read n8n-worker --region=southamerica-east1 --limit=50

# 2. Ver logs do notify-n8n
supabase functions logs notify-n8n --limit=50

# 3. Ver logs do n8n-callback
supabase functions logs n8n-callback --limit=50

# 4. Ver execuções via API (substitua URL e API_KEY)
curl -X GET "https://[n8n-url]/api/v1/executions" \
  -H "X-N8N-API-KEY: SUA_API_KEY"
```

---

**Última atualização:** 2026-02-02
