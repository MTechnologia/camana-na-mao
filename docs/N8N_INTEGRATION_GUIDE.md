# Guia de Integração N8N - CMSP Connect

Este documento descreve a configuração técnica para integrar workflows N8N com o sistema CMSP Connect, permitindo processamento externo automatizado de manifestações cidadãs.

## Índice

1. [Arquitetura](#arquitetura)
2. [Credenciais de Conexão](#credenciais-de-conexão)
3. [Configuração do Webhook de Entrada](#configuração-do-webhook-de-entrada)
4. [Payloads de Entrada](#payloads-de-entrada)
5. [Workflow N8N Sugerido](#workflow-n8n-sugerido)
6. [Callback para Supabase](#callback-para-supabase)
7. [Tratamento de Erros](#tratamento-de-erros)
8. [Checklist de Configuração](#checklist-de-configuração)

---

## Arquitetura

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   CMSP Connect  │      │      N8N        │      │    Supabase     │
│   (Frontend)    │      │   (Workflow)    │      │   (Backend)     │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         │  1. Criar Relato       │                        │
         │───────────────────────>│                        │
         │                        │                        │
         │                        │  2. Webhook Trigger    │
         │                        │<───────────────────────│
         │                        │                        │
         │                        │  3. Processar (IA)     │
         │                        │────────┐               │
         │                        │        │               │
         │                        │<───────┘               │
         │                        │                        │
         │                        │  4. Callback           │
         │                        │───────────────────────>│
         │                        │                        │
         │  5. Atualizar UI       │                        │
         │<────────────────────────────────────────────────│
         │                        │                        │
```

### Fluxo de Dados

1. **Cidadão cria manifestação** via chatbot ou formulário
2. **Edge Function `notify-n8n`** envia payload para webhook N8N
3. **N8N processa** a manifestação (classificação, priorização, enriquecimento)
4. **N8N envia callback** para Edge Function `n8n-callback`
5. **Supabase atualiza** o registro com dados processados
6. **UI Admin** exibe dados enriquecidos no Kanban

---

## Credenciais de Conexão

### Informações do Projeto

| Campo | Valor |
|-------|-------|
| **Project ID** | `vzkwkcypkfrpfhhsghwn` |
| **Supabase URL** | `https://vzkwkcypkfrpfhhsghwn.supabase.co` |
| **Callback URL** | `https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/n8n-callback` |

### Configuração na UI Admin

1. Acesse **Configurações > Integração N8N**
2. Configure:
   - **Webhook URL**: URL do seu webhook N8N (ex: `https://seu-n8n.app.n8n.cloud/webhook/cmsp-manifestacao`)
   - **Secret Key**: Chave secreta para autenticação (gere uma chave forte)
3. Ative os eventos desejados:
   - `urban_report_created` - Relatos urbanos
   - `transport_report_created` - Relatos de transporte
   - `service_rating_created` - Avaliações de serviço

---

## Configuração do Webhook de Entrada

### Node: Webhook Trigger

```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "cmsp-manifestacao",
    "responseMode": "responseNode",
    "options": {
      "rawBody": false
    }
  },
  "type": "n8n-nodes-base.webhook",
  "name": "Webhook CMSP"
}
```

### Headers Esperados

| Header | Descrição |
|--------|-----------|
| `Content-Type` | `application/json` |
| `x-n8n-secret` | Chave secreta configurada na UI Admin |

### Validação de Segurança

Adicione um node **IF** para validar o secret:

```javascript
// Expressão de validação
{{ $json.secret_key === 'SUA_CHAVE_SECRETA' }}
```

---

## Payloads de Entrada

### Evento: `urban_report_created`

```json
{
  "event": "urban_report_created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "report_id": "550e8400-e29b-41d4-a716-446655440000",
  "report_type": "urban",
  "report_data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "category": "iluminacao",
    "subcategory": "lampada_queimada",
    "description": "Poste sem luz na esquina da Rua Augusta com Av. Paulista há 3 dias",
    "severity": "media",
    "status": "pending",
    "location_address": "Rua Augusta, 1500 - Consolação, São Paulo",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "photos": ["https://storage.url/photo1.jpg"],
    "ai_classification": {
      "category": "iluminacao",
      "confidence": 0.95,
      "keywords": ["poste", "luz", "escuro"]
    },
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "user_id": "user-uuid-here",
  "callback_url": "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/n8n-callback",
  "secret_key": "sua-chave-secreta"
}
```

### Evento: `transport_report_created`

```json
{
  "event": "transport_report_created",
  "timestamp": "2024-01-15T11:45:00.000Z",
  "report_id": "660e8400-e29b-41d4-a716-446655440001",
  "report_type": "transport",
  "report_data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "report_type": "atraso",
    "description": "Ônibus 875A-10 atrasou mais de 40 minutos no ponto Terminal Pinheiros",
    "severity": "high",
    "status": "pending",
    "line_id": "uuid-da-linha",
    "line_code_custom": "875A-10",
    "location": "Terminal Pinheiros",
    "occurrence_date": "2024-01-15",
    "occurrence_time": "08:30:00",
    "impact_description": "Perdi compromisso importante no trabalho",
    "ai_category": "atraso",
    "ai_sentiment": "negative",
    "ai_pattern_detected": true,
    "created_at": "2024-01-15T11:45:00.000Z"
  },
  "user_id": "user-uuid-here",
  "callback_url": "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/n8n-callback",
  "secret_key": "sua-chave-secreta"
}
```

### Evento: `service_rating_created`

```json
{
  "event": "service_rating_created",
  "timestamp": "2024-01-15T14:20:00.000Z",
  "report_id": "770e8400-e29b-41d4-a716-446655440002",
  "report_type": "service_rating",
  "report_data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "service_id": "uuid-do-servico",
    "service_name": "UBS Vila Mariana",
    "service_type": "ubs",
    "rating_stars": 2,
    "rating_text": "Esperei 3 horas para ser atendido, falta de médicos",
    "sentiment": "negative",
    "visit_id": "uuid-da-visita",
    "created_at": "2024-01-15T14:20:00.000Z"
  },
  "user_id": "user-uuid-here",
  "callback_url": "https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/n8n-callback",
  "secret_key": "sua-chave-secreta"
}
```

---

## Workflow N8N Sugerido

### Workflow Básico

```
[Webhook] → [Switch por Evento] → [Classificar Prioridade] → [Callback]
```

### Workflow com IA

```
[Webhook] → [Switch] → [OpenAI/Claude] → [Parse JSON] → [Enriquecer] → [Callback]
```

### Exemplo de Node: Classificação com IA

```json
{
  "parameters": {
    "model": "gpt-4",
    "messages": {
      "values": [
        {
          "role": "system",
          "content": "Você é um classificador de manifestações cidadãs para a Câmara Municipal de São Paulo. Analise a manifestação e retorne JSON com: priority (urgent/high/medium/low), validated_category (categoria validada), tags (array de tags relevantes), enriched_data (dados adicionais úteis)."
        },
        {
          "role": "user",
          "content": "Tipo: {{ $json.report_type }}\nCategoria: {{ $json.report_data.category }}\nDescrição: {{ $json.report_data.description }}\nSeveridade informada: {{ $json.report_data.severity }}\nLocalização: {{ $json.report_data.location_address || $json.report_data.location }}"
        }
      ]
    },
    "options": {
      "response_format": "json_object"
    }
  },
  "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
  "name": "Classificar com IA"
}
```

### Exemplo de Node: Parse de Resposta IA

```json
{
  "parameters": {
    "jsCode": "const aiResponse = JSON.parse($input.first().json.message.content);\n\nreturn {\n  report_id: $('Webhook CMSP').first().json.report_id,\n  report_type: $('Webhook CMSP').first().json.report_type,\n  secret_key: $('Webhook CMSP').first().json.secret_key,\n  processed_data: {\n    priority: aiResponse.priority,\n    validated_category: aiResponse.validated_category,\n    tags: aiResponse.tags,\n    enriched_data: aiResponse.enriched_data,\n    workflow_id: $workflow.id\n  }\n};"
  },
  "type": "n8n-nodes-base.code",
  "name": "Preparar Callback"
}
```

---

## Callback para Supabase

### Endpoint

```
POST https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/n8n-callback
```

### Payload do Callback

```json
{
  "report_id": "550e8400-e29b-41d4-a716-446655440000",
  "report_type": "urban",
  "secret_key": "sua-chave-secreta",
  "processed_data": {
    "priority": "high",
    "validated_category": "iluminacao_publica",
    "tags": ["seguranca", "via_publica", "urgente"],
    "enriched_data": {
      "distrito": "Consolação",
      "subprefeitura": "Sé",
      "orgao_responsavel": "ILUME",
      "tempo_estimado_resolucao": "48h",
      "similar_reports_count": 3,
      "pattern_detected": true
    },
    "workflow_id": "workflow-uuid"
  }
}
```

### Node: HTTP Request (Callback)

```json
{
  "parameters": {
    "method": "POST",
    "url": "={{ $('Webhook CMSP').first().json.callback_url }}",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        },
        {
          "name": "x-n8n-secret",
          "value": "={{ $('Webhook CMSP').first().json.secret_key }}"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "report_id",
          "value": "={{ $json.report_id }}"
        },
        {
          "name": "report_type",
          "value": "={{ $json.report_type }}"
        },
        {
          "name": "secret_key",
          "value": "={{ $json.secret_key }}"
        },
        {
          "name": "processed_data",
          "value": "={{ $json.processed_data }}"
        }
      ]
    }
  },
  "type": "n8n-nodes-base.httpRequest",
  "name": "Callback Supabase"
}
```

### Resposta do Callback

**Sucesso (200)**:
```json
{
  "success": true,
  "message": "Report updated successfully",
  "report_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Erro de Autenticação (401)**:
```json
{
  "success": false,
  "error": "Invalid secret key"
}
```

**Erro de Validação (400)**:
```json
{
  "success": false,
  "error": "Missing required fields: report_id, report_type, secret_key"
}
```

---

## Tratamento de Erros

### Retry Automático

Configure retry no node HTTP Request:

```json
{
  "retryOnFail": true,
  "maxRetries": 3,
  "waitBetweenRetries": 5000
}
```

### Notificação de Falhas

Adicione um node de notificação (Slack, Email, etc.) no branch de erro:

```
[HTTP Request] ─── Error ───> [Slack Notification]
```

### Logs de Integração

Todas as requisições são logadas na tabela `n8n_integration_logs`:

| Campo | Descrição |
|-------|-----------|
| `event_type` | `outbound` (CMSP→N8N) ou `inbound` (N8N→CMSP) |
| `entity_type` | `urban`, `transport`, `service_rating` |
| `entity_id` | UUID do relatório |
| `payload` | Payload enviado/recebido |
| `response` | Resposta da requisição |
| `status` | `sent`, `received`, `error` |
| `error_message` | Mensagem de erro (se houver) |

---

## Checklist de Configuração

### No CMSP Connect

- [ ] Acessar **Configurações > Integração N8N**
- [ ] Inserir **Webhook URL** do N8N
- [ ] Gerar e inserir **Secret Key** segura
- [ ] Ativar eventos desejados
- [ ] Testar conexão com botão "Testar Conexão"
- [ ] Verificar logs de integração

### No N8N

- [ ] Criar webhook com path `/cmsp-manifestacao`
- [ ] Configurar validação de `secret_key`
- [ ] Implementar lógica de classificação/processamento
- [ ] Configurar node de callback HTTP
- [ ] Testar workflow com payload de exemplo
- [ ] Ativar workflow em produção
- [ ] Configurar alertas de erro

### Campos Atualizados pelo Callback

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `n8n_processed` | boolean | Indica se foi processado |
| `n8n_processed_at` | timestamp | Data/hora do processamento |
| `n8n_priority` | text | Prioridade definida (urgent/high/medium/low) |
| `n8n_validated_category` | text | Categoria validada pela IA |
| `n8n_tags` | text[] | Array de tags |
| `n8n_enriched_data` | jsonb | Dados enriquecidos |
| `n8n_workflow_id` | text | ID do workflow N8N |

---

## Suporte

Para dúvidas sobre a integração:

1. Verifique os logs em **Configurações > Integração N8N**
2. Consulte a tabela `n8n_integration_logs` para detalhes
3. Teste payloads isoladamente com ferramentas como Postman/Insomnia

---

*Documentação atualizada em: Dezembro 2024*
