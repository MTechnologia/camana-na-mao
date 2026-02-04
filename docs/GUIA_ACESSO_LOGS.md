# Guia de Acesso aos Logs do Sistema

**Data:** 2026-01-28  
**Versão:** 1.0

---

## 📋 Índice

1. [Logs do Supabase Edge Functions](#1-logs-do-supabase-edge-functions)
2. [Logs de Auditoria (Audit Logs)](#2-logs-de-auditoria-audit-logs)
3. [Logs do GCP Cloud Run](#3-logs-do-gcp-cloud-run)
4. [Logs do vLLM (VM GCP)](#4-logs-do-vllm-vm-gcp)
5. [Logs do n8n](#5-logs-do-n8n)
6. [Logs do Frontend (Browser Console)](#6-logs-do-frontend-browser-console)

---

## 1. Logs do Supabase Edge Functions

### 1.1 Via Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Edge Functions** → **Logs**
4. Selecione a função (ex: `ai-orchestrator`)
5. Filtre por data/hora ou busque por termos específicos

**URL Direta:**
```
https://supabase.com/dashboard/project/[PROJECT_ID]/functions/[FUNCTION_NAME]/logs
```

### 1.2 Via Supabase CLI

```bash
# Ver logs em tempo real
supabase functions logs ai-orchestrator --follow

# Ver últimos 100 logs
supabase functions logs ai-orchestrator --limit 100

# Filtrar por nível (erro, warn, info)
supabase functions logs ai-orchestrator --level error

# Ver logs de uma função específica com filtro
supabase functions logs ai-orchestrator --grep "Fatal error"
```

### 1.3 Principais Logs do AI Orchestrator

Os logs do `ai-orchestrator` incluem:

- `[ai-orchestrator] Request started at` - Início de cada requisição
- `[ai-orchestrator] Missing env vars` - Variáveis de ambiente faltando
- `[ai-orchestrator] Unauthorized` - Erros de autenticação
- `[ai-orchestrator] Bad Request (400) from vLLM` - Erros do vLLM
- `[ai-orchestrator] Fatal error` - Erros fatais
- `[executeTool]` - Execução de tools
- `[generateIntelligentLabel]` - Geração de labels
- `[detectEmergingCategory]` - Detecção de categorias

**Exemplo de busca:**
```bash
# Ver apenas erros
supabase functions logs ai-orchestrator --grep "error|Error|ERROR"

# Ver requisições recentes
supabase functions logs ai-orchestrator --grep "Request started"
```

---

## 2. Logs de Auditoria (Audit Logs)

### 2.1 Via Interface Web (Admin)

1. Acesse a aplicação web
2. Faça login como admin
3. Vá em **Admin** → **Audit Logs**
4. Visualize, filtre e exporte logs

### 2.2 Via SQL (Supabase Dashboard)

```sql
-- Últimos 50 logs
SELECT 
  id,
  user_id,
  action,
  entity_type,
  entity_id,
  metadata,
  created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 50;

-- Logs de um usuário específico
SELECT * 
FROM audit_logs
WHERE user_id = 'USER_ID_AQUI'
ORDER BY created_at DESC
LIMIT 100;

-- Logs de uma ação específica
SELECT * 
FROM audit_logs
WHERE action = 'login'
ORDER BY created_at DESC
LIMIT 100;

-- Logs de hoje
SELECT * 
FROM audit_logs
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

### 2.3 Via Hook React

```typescript
import { useAuditLog } from '@/hooks/useAuditLog';

const { getMyLogs, getAllLogs } = useAuditLog();

// Meus logs
const myLogs = await getMyLogs(50);

// Todos os logs (admin)
const allLogs = await getAllLogs({
  action: 'login',
  limit: 100,
  startDate: new Date('2026-01-01'),
  endDate: new Date()
});
```

---

## 3. Logs do GCP Cloud Run

### 3.1 Via GCP Console

1. Acesse: https://console.cloud.google.com
2. Selecione o projeto
3. Vá em **Cloud Run** → Selecione o serviço (ex: `camana-na-mao`)
4. Clique na aba **Logs**
5. Filtre por data, nível ou texto

**URL Direta:**
```
https://console.cloud.google.com/run/detail/[REGION]/[SERVICE_NAME]/logs?project=[PROJECT_ID]
```

### 3.2 Via gcloud CLI

```bash
# Ver logs em tempo real
gcloud run services logs read camana-na-mao --region southamerica-east1 --follow

# Últimos 100 logs
gcloud run services logs read camana-na-mao --region southamerica-east1 --limit 100

# Filtrar por nível
gcloud run services logs read camana-na-mao --region southamerica-east1 --level error

# Filtrar por texto
gcloud run services logs read camana-na-mao --region southamerica-east1 --grep "error"

# Logs de um período específico
gcloud run services logs read camana-na-mao \
  --region southamerica-east1 \
  --since "2026-01-28T00:00:00Z" \
  --until "2026-01-28T23:59:59Z"
```

### 3.3 Logs do n8n no Cloud Run

```bash
# Logs do n8n
gcloud run services logs read n8n --region southamerica-east1 --follow
```

---

## 4. Logs do vLLM (VM GCP)

### 4.1 Via SSH na VM

```bash
# Conectar na VM
gcloud compute ssh llm-chat-gpu --zone us-central1-b

# Ver logs do container Docker
docker logs vllm-chat --follow

# Últimos 1000 linhas
docker logs vllm-chat --tail 1000

# Logs desde uma data específica
docker logs vllm-chat --since "2026-01-28T00:00:00Z"

# Ver logs do sistema (journald)
sudo journalctl -u docker -f

# Ver logs do sistema (últimas 100 linhas)
sudo journalctl -u docker -n 100
```

### 4.2 Via Serial Console (GCP)

1. Acesse: https://console.cloud.google.com
2. Vá em **Compute Engine** → **VM instances**
3. Clique na VM `llm-chat-gpu`
4. Clique em **Serial console**
5. Visualize os logs em tempo real

**URL Direta:**
```
https://console.cloud.google.com/compute/instancesDetail/zones/[ZONE]/instances/llm-chat-gpu/serialConsole?project=[PROJECT_ID]
```

### 4.3 Verificar Status do Container

```bash
# Status do container
docker ps -a | grep vllm

# Logs de erro
docker logs vllm-chat 2>&1 | grep -i error

# Últimas requisições
docker logs vllm-chat --tail 50 | grep "POST /v1/chat/completions"
```

---

## 5. Logs do n8n

### 5.1 Via Interface Web do n8n

1. Acesse a URL do n8n (Cloud Run)
2. Faça login
3. Vá em **Executions** (Execuções)
4. Visualize execuções, erros e logs de cada workflow

### 5.2 Via API do n8n

```bash
# Obter execuções recentes
curl -X GET "https://n8n-url.com/api/v1/executions" \
  -H "X-N8N-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json"

# Obter execução específica
curl -X GET "https://n8n-url.com/api/v1/executions/EXECUTION_ID" \
  -H "X-N8N-API-KEY: YOUR_API_KEY"
```

### 5.3 Via Cloud Run Logs

```bash
# Logs do n8n no Cloud Run
gcloud run services logs read n8n --region southamerica-east1 --follow
```

---

## 6. Logs do Frontend (Browser Console)

### 6.1 Chrome/Edge DevTools

1. Abra a aplicação web
2. Pressione `F12` ou `Ctrl+Shift+I`
3. Vá na aba **Console**
4. Filtre por nível (Errors, Warnings, Info)

### 6.2 Principais Logs do Frontend

- `[useUnifiedAIChat]` - Logs do hook de chat
- `[useUnifiedAIChat] Token found` - Token de autenticação
- `[useUnifiedAIChat] API error` - Erros da API
- `Error loading profile` - Erros ao carregar perfil
- `Error loading profile` - Erros de autenticação

### 6.3 Filtrar Logs no Console

```javascript
// No console do browser, você pode filtrar:
// - Por texto: digite "error" na caixa de filtro
// - Por nível: clique nos ícones de erro/warning/info
// - Por origem: filtre por arquivo (ex: "useUnifiedAIChat.ts")
```

---

## 🔍 Comandos Rápidos de Referência

### Ver Todos os Logs Recentes

```bash
# 1. Supabase Edge Functions
supabase functions logs ai-orchestrator --limit 50

# 2. GCP Cloud Run (Frontend)
gcloud run services logs read camana-na-mao --region southamerica-east1 --limit 50

# 3. GCP Cloud Run (n8n)
gcloud run services logs read n8n --region southamerica-east1 --limit 50

# 4. vLLM (via SSH)
gcloud compute ssh llm-chat-gpu --zone us-central1-b --command "docker logs vllm-chat --tail 50"
```

### Ver Apenas Erros

```bash
# Supabase
supabase functions logs ai-orchestrator --level error --limit 100

# GCP Cloud Run
gcloud run services logs read camana-na-mao --region southamerica-east1 --level error --limit 100

# vLLM
gcloud compute ssh llm-chat-gpu --zone us-central1-b --command "docker logs vllm-chat 2>&1 | grep -i error | tail -50"
```

### Monitorar em Tempo Real

```bash
# Supabase
supabase functions logs ai-orchestrator --follow

# GCP Cloud Run
gcloud run services logs read camana-na-mao --region southamerica-east1 --follow

# vLLM
gcloud compute ssh llm-chat-gpu --zone us-central1-b --command "docker logs vllm-chat --follow"
```

---

## 📊 Estrutura de Logs por Componente

### AI Orchestrator

```
[ai-orchestrator] Request started at 2026-01-28T10:00:00.000Z
[ai-orchestrator] Frontend collectionType received: urban_report
[ai-orchestrator] User authenticated: user_id
[executeTool] Executing classify_report_category
[executeTool] Tool executed successfully
[ai-orchestrator] Response stream completed
```

### vLLM

```
INFO:     127.0.0.1:xxxxx - "POST /v1/chat/completions HTTP/1.1" 200 OK
INFO:     Request: model=meta-llama/Llama-3.1-8B-Instruct, messages=3, tools=12
INFO:     Response: tokens=150, time=2.3s
```

### n8n

```
[Workflow: "Process Report"] Execution started
[HTTP Request] Request to vLLM: POST /v1/chat/completions
[HTTP Request] Response: 200 OK
[Workflow: "Process Report"] Execution completed successfully
```

---

## 🚨 Troubleshooting

### Logs Não Aparecem

1. **Supabase**: Verifique se a função foi deployada
2. **GCP Cloud Run**: Verifique se o serviço está rodando
3. **vLLM**: Verifique se o container está rodando (`docker ps`)

### Logs Muito Verbosos

1. **Filtre por nível**: Use `--level error` ou `--grep "error"`
2. **Limite resultados**: Use `--limit 50`
3. **Filtre por data**: Use `--since` e `--until`

### Logs Não Persistem

- **Supabase**: Logs são mantidos por 7 dias
- **GCP Cloud Run**: Logs são mantidos por 30 dias
- **vLLM**: Logs do container são voláteis (use `docker logs`)

---

## 📝 Notas Importantes

1. **Retenção de Logs**:
   - Supabase: 7 dias
   - GCP Cloud Run: 30 dias
   - Audit Logs (DB): Permanente (conforme política de retenção)

2. **Níveis de Log**:
   - `error`: Erros que impedem execução
   - `warn`: Avisos que não impedem execução
   - `info`: Informações gerais
   - `debug`: Informações de debug (desenvolvimento)

3. **Dados Sensíveis**:
   - Tokens JWT são mascarados nos logs
   - Senhas nunca são logadas
   - Dados pessoais são logados apenas quando necessário para auditoria

---

**Última atualização:** 2026-01-28
