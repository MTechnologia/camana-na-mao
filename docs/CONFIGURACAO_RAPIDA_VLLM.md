# Configuração Rápida: vLLM no Supabase

**Data:** 2026-01-27  
**Problema:** Chat de IA sem resposta ou erro de configuração do provedor LLM

---

## Solução: Configurar vLLM como Provider Principal

### Passo 1: Acessar Secrets do Supabase

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto (`vjzkzsczlbtmrzewffdx`)
3. Vá em **Project Settings** > **Edge Functions** > **Secrets**

### Passo 2: Adicionar Secrets do vLLM

Adicione os seguintes secrets (um por vez):

#### Secret 1: `AI_CHAT_BASE_URL`

1. Clique em **Add new secret**
2. Configure:
   - **Name**: `AI_CHAT_BASE_URL`
   - **Value**: `http://34.41.3.173:8000/v1`
3. Clique em **Save**

#### Secret 2: `AI_API_KEY` ⚠️ **OBRIGATÓRIO**

1. Clique em **Add new secret**
2. Configure:
   - **Name**: `AI_API_KEY`
   - **Value**: `dummy` (ou qualquer string - o vLLM não usa autenticação)
3. Clique em **Save**

**Por que?** O código verifica se `AI_API_KEY` existe. Como o vLLM não requer autenticação, qualquer valor serve.

#### Secret 3: `AI_CHAT_MODEL` (Opcional, mas recomendado)

1. Clique em **Add new secret**
2. Configure:
   - **Name**: `AI_CHAT_MODEL`
   - **Value**: `Qwen/Qwen2.5-3B-Instruct`
3. Clique em **Save**

### Passo 3: Verificar Configuração

Após adicionar os secrets, você deve ter:

```
✅ AI_CHAT_BASE_URL = http://34.41.3.173:8000/v1
✅ AI_API_KEY = dummy (obrigatório - qualquer valor serve)
✅ AI_CHAT_MODEL = Qwen/Qwen2.5-3B-Instruct (opcional)
```

---

## Ordem de Prioridade

Com essa configuração, o sistema usa o endpoint configurado em `AI_CHAT_BASE_URL` (compatível com API OpenAI). Se a URL ou a chave estiverem incorretas, as Edge Functions retornam erro nos logs.

---

## Teste

Após configurar:

1. **Aguarde 1-2 minutos** (para o Supabase recarregar os secrets)
2. **Teste no app/web** enviando uma mensagem no chat
3. **Verifique os logs** do `ai-orchestrator` no Supabase

### Logs Esperados (Sucesso):

```
[ai-orchestrator] Using AI_CHAT_BASE_URL: http://35.193.16.137:8000/v1
[ai-orchestrator] Request to http://35.193.16.137:8000/v1/chat/completions
```

### Se Ainda Der Erro:

1. Verifique se o vLLM está rodando na VM:
   ```bash
   gcloud compute ssh llm-chat-gpu --zone=us-central1-b
   docker ps  # Deve mostrar o container vllm-chat rodando
   ```

2. Verifique se a porta 8000 está aberta no firewall do GCP

3. Teste a conexão diretamente:
   ```bash
   curl http://34.41.3.173:8000/v1/models
   ```

---

## Troubleshooting

### Erro: "Connection refused" ou "Network timeout"

**Causa**: vLLM não está acessível publicamente.

**Solução**:
1. Verifique se o vLLM está rodando: `docker ps` na VM
2. Verifique o firewall do GCP (porta 8000 deve estar aberta)
3. Se necessário, abra a porta:
   ```bash
   gcloud compute firewall-rules create allow-vllm-8000 \
     --allow tcp:8000 \
     --source-ranges 0.0.0.0/0 \
     --target-tags llm-chat-gpu
   ```

### Erro: "401 Unauthorized"

**Causa**: vLLM requer API key mas não foi configurada.

**Solução**: Se o vLLM não requer API key, não precisa configurar `AI_CHAT_API_KEY`. Se requer, adicione o secret.

### Erro: "Model not found"

**Causa**: Modelo especificado não está disponível no vLLM.

**Solução**: 
1. Verifique modelos disponíveis: `curl http://34.41.3.173:8000/v1/models`
2. Ajuste `AI_CHAT_MODEL` para um modelo disponível
3. Ou remova `AI_CHAT_MODEL` para usar o padrão do vLLM

---

## Configuração Completa Recomendada

```bash
AI_CHAT_BASE_URL=http://34.41.3.173:8000/v1
AI_API_KEY=dummy
AI_CHAT_MODEL=Qwen/Qwen2.5-3B-Instruct
```

---

**Última atualização:** 2026-01-27
