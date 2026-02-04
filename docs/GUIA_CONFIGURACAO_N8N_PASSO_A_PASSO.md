# Guia Passo-a-Passo: Configuração N8N - Câmara na Mão

**Data:** 2026-01-22  
**Projeto:** `vjzkzsczlbtmrzewffdx` (Supabase Cloud)

---

## 📋 Pré-requisitos

- [ ] Acesso ao n8n (self-hosted ou n8n.cloud)
- [ ] Acesso de **admin** no Supabase (para configurar via UI)
- [ ] URL pública do seu n8n (ex: `https://seu-n8n.app.n8n.cloud` ou `https://n8n.seudominio.com`)

---

## 🎯 Passo 1: Criar Webhook no N8N

### 1.1 Acessar seu N8N
1. Abra seu n8n (self-hosted ou n8n.cloud)
2. Crie um **novo workflow** ou abra um existente

### 1.2 Adicionar Node "Webhook"
1. Clique em **"+"** para adicionar node
2. Procure por **"Webhook"** e selecione
3. Configure:
   - **HTTP Method**: `POST`
   - **Path**: `cmara-na-mao` (ou o nome que preferir)
   - **Response Mode**: `Response Node`
   - **Authentication**: `None` (vamos validar via header depois)

### 1.3 Ativar o Workflow
1. Clique em **"Save"** e depois **"Active"** (toggle no canto superior direito)
2. Copie a **URL do webhook** que aparece (ex: `https://seu-n8n.app.n8n.cloud/webhook/cmara-na-mao`)

---

## 🔐 Passo 2: Gerar Secret Key

Gere uma chave secreta forte para autenticação:

```bash
# No PowerShell ou terminal
openssl rand -hex 32
```

Ou use um gerador online: https://www.random.org/strings/

**Exemplo de secret key gerada:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

**⚠️ IMPORTANTE:** Guarde essa chave! Você vai precisar dela no n8n e no Supabase.

---

## ⚙️ Passo 3: Configurar no Supabase (via UI Admin)

### 3.1 Acessar UI Admin
1. Acesse sua aplicação web: `https://camana-na-mao-767943602990.southamerica-east1.run.app` (ou sua URL)
2. Faça login com usuário **admin**
3. Vá em **Configurações > Integração N8N** (ou `/admin/settings/n8n`)

### 3.2 Preencher Configurações
1. **Webhook URL**: Cole a URL do webhook do n8n (Passo 1.3)
2. **Secret Key**: Cole a chave gerada (Passo 2)
3. **Ativar eventos**:
   - ✅ `urban_report_created` - Relatos urbanos
   - ✅ `transport_report_created` - Relatos de transporte
   - ✅ `service_rating_created` - Avaliações de serviço
4. Clique em **"Salvar Configurações"**

### 3.3 Testar Conexão
1. Clique em **"Testar Conexão"**
2. Verifique se aparece mensagem de sucesso
3. Se der erro, verifique:
   - URL do webhook está correta
   - Workflow do n8n está **ativo**
   - n8n está acessível publicamente

---

## 🔄 Passo 4: Configurar Workflow N8N (Básico)

### 4.1 Estrutura Mínima do Workflow

```
[Webhook] → [Validar Secret] → [Processar] → [Callback]
```

### 4.2 Node 1: Webhook (já criado no Passo 1)
- Já configurado

### 4.3 Node 2: Validar Secret Key (IF Node)

Adicione um node **"IF"** após o Webhook:

**Condição:**
```javascript
{{ $json.headers['x-n8n-secret'] === 'SUA_SECRET_KEY_AQUI' }}
```

**⚠️ IMPORTANTE:** Substitua `SUA_SECRET_KEY_AQUI` pela mesma chave que você configurou no Supabase (Passo 2).

**Configuração:**
- **Mode**: `Expression`
- **Value 1**: `{{ $json.headers['x-n8n-secret'] }}`
- **Operation**: `Equal`
- **Value 2**: `SUA_SECRET_KEY_AQUI` (a mesma do Passo 2)

### 4.4 Node 3: Extrair Dados (Code Node - Opcional)

Adicione um node **"Code"** para extrair dados do payload:

```javascript
// Extrair dados do webhook
const body = $input.first().json.body || $input.first().json;

return {
  event: body.event,
  report_id: body.report.id,
  report_type: body.report.type,
  description: body.report.description,
  callback_url: body.callback_url,
  secret_key: body.secret_key || $json.headers['x-n8n-secret'],
  orchestrator: body.orchestrator || {}
};
```

### 4.5 Node 4: Processar (Code Node - Exemplo Simples)

Adicione um node **"Code"** para processar (exemplo básico):

```javascript
const input = $input.first().json;

// Processamento simples (você pode adicionar IA, APIs externas, etc.)
const processedData = {
  priority: 'normal',
  validated_category: input.report_type,
  tags: ['PROCESSADO_N8N'],
  enriched_data: {
    processed_at: new Date().toISOString(),
    workflow_id: $workflow.id
  }
};

return {
  report_id: input.report_id,
  report_type: input.report_type,
  secret_key: input.secret_key,
  processed_data: processedData
};
```

### 4.6 Node 5: Callback para Supabase (HTTP Request)

Adicione um node **"HTTP Request"**:

**Configuração:**
- **Method**: `POST`
- **URL**: `https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/n8n-callback`
- **Headers**:
  - `Content-Type`: `application/json`
  - `x-n8n-secret`: `={{ $('Extrair Dados').first().json.secret_key }}`
- **Body**:
```json
{
  "report_id": "={{ $json.report_id }}",
  "report_type": "={{ $json.report_type }}",
  "secret_key": "={{ $json.secret_key }}",
  "processed_data": "={{ $json.processed_data }}"
}
```

### 4.7 Node 6: Tratamento de Erro (Opcional)

Adicione um node **"IF"** após o Callback para verificar sucesso:

**Condição:**
```javascript
{{ $json.statusCode === 200 }}
```

- **True**: Log de sucesso (opcional)
- **False**: Notificação de erro (Slack, Email, etc.)

---

## ✅ Passo 5: Validar Configuração

### 5.1 Testar End-to-End

1. **No app/web**, crie um relato urbano via chat
2. **No n8n**, verifique se o webhook foi acionado (execuções aparecem no histórico)
3. **No Supabase**, verifique a tabela `n8n_integration_logs`:
   ```sql
   SELECT * FROM n8n_integration_logs 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
4. **No app/web**, verifique se o relato foi atualizado com dados do n8n (campos `n8n_*`)

### 5.2 Verificar Logs

**No Supabase (UI Admin):**
- Acesse **Configurações > Integração N8N > Aba "Logs"**
- Veja histórico de requisições (sucesso/erro)

**No n8n:**
- Veja execuções do workflow
- Verifique logs de cada node

---

## 🔧 Configurações Avançadas (Opcional)

### Usar IA no N8N

Se quiser usar IA (OpenAI, Claude, etc.) no n8n para classificar relatos:

1. Adicione node **"OpenAI"** ou **"HTTP Request"** (para chamar API de IA)
2. Configure prompt para análise do relato
3. Parse da resposta JSON
4. Use os dados processados no callback

**Exemplo de prompt:**
```
Analise este relato cidadão e retorne JSON com:
- priority: "urgent" | "high" | "medium" | "low"
- validated_category: categoria validada
- tags: array de tags relevantes
- enriched_data: dados adicionais úteis

Relato: {{ $json.description }}
```

### Integrações Externas

Você pode adicionar nodes para:
- **WhatsApp**: Enviar notificação ao cidadão
- **Email**: Enviar confirmação
- **Sistema de Tickets**: Criar ticket em sistema externo
- **Portal da Prefeitura**: Enviar relato para sistema municipal

---

## 📊 Monitoramento

### Métricas Importantes

1. **Taxa de sucesso**: `status = 'sent'` vs `status = 'error'` em `n8n_integration_logs`
2. **Tempo de processamento**: Diferença entre `created_at` do relato e `n8n_processed_at`
3. **Erros comuns**: Verifique `error_message` nos logs

### Alertas (Recomendado)

Configure alertas no n8n para:
- Falhas no callback (status != 200)
- Timeout de requisições
- Erros de validação

---

## 🐛 Troubleshooting

### Problema: Webhook não recebe requisições

**Soluções:**
- Verifique se workflow está **ativo** no n8n
- Verifique se URL do webhook está correta no Supabase
- Teste a URL manualmente com Postman/curl:
  ```bash
  curl -X POST https://seu-n8n.app.n8n.cloud/webhook/cmara-na-mao \
    -H "Content-Type: application/json" \
    -H "x-n8n-secret: SUA_SECRET_KEY" \
    -d '{"test": true}'
  ```

### Problema: Callback retorna 401 (Invalid secret key)

**Soluções:**
- Verifique se `secret_key` no payload do callback é **exatamente igual** ao configurado no Supabase
- Verifique se está enviando no header `x-n8n-secret` E no body `secret_key`

### Problema: Dados não aparecem no relato após processamento

**Soluções:**
- Verifique se `report_id` e `report_type` estão corretos no callback
- Verifique se `processed_data` tem a estrutura esperada
- Verifique logs do Edge Function `n8n-callback` no Supabase

---

## 📝 Checklist Final

- [ ] Webhook criado no n8n e workflow ativo
- [ ] Secret key gerada e configurada (n8n + Supabase)
- [ ] Configurações salvas na UI Admin do Supabase
- [ ] Teste de conexão passou
- [ ] Workflow básico configurado (Webhook → Validar → Processar → Callback)
- [ ] Teste end-to-end funcionando
- [ ] Logs sendo registrados corretamente

---

## 🔗 Referências

- **Documentação completa**: `docs/N8N_INTEGRATION_GUIDE.md`
- **Edge Function notify-n8n**: `supabase/functions/notify-n8n/index.ts`
- **Edge Function n8n-callback**: `supabase/functions/n8n-callback/index.ts`
- **UI Admin**: `src/pages/admin/settings/N8NIntegration.tsx`

---

**Última atualização:** 2026-01-22
