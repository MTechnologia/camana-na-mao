# Troubleshooting: Erro 400 do vLLM

**Data:** 2026-01-28  
**Problema:** Chat falha às vezes com erro 400 (Bad Request) do vLLM

---

## 🔍 Causas Possíveis do Erro 400

O erro 400 (Bad Request) do vLLM pode ser causado por:

1. **Modelo não encontrado**: O modelo especificado não está disponível no vLLM
2. **Parâmetros inválidos**: Algum parâmetro não é suportado pelo vLLM
3. **Payload muito grande**: Mensagens ou system prompt muito longos
4. **Formato incorreto**: Estrutura do JSON não compatível
5. **Tool calling**: vLLM pode não suportar tool calling da mesma forma que OpenAI

---

## ✅ Correção Implementada

Adicionei tratamento específico para erro 400 que:

1. **Loga detalhes do erro** para debugging
2. **Tenta fallback automático** para Lovable AI (se configurado)
3. **Retorna mensagem amigável** ao usuário ao invés de crashar

### Código Adicionado

```typescript
// Handle 400 Bad Request - try fallback to Lovable if available
if (response.status === 400) {
  console.error('[ai-orchestrator] Bad Request (400) from vLLM:', errorText);
  console.log('[ai-orchestrator] Attempting fallback to Lovable AI...');
  
  // Try fallback to Lovable if available
  if (lovableApiKey && finalAiBaseUrl !== 'https://ai.gateway.lovable.dev/v1') {
    // ... fallback logic
  }
}
```

---

## 🔧 Verificações e Soluções

### 1. Verificar Modelo no vLLM

O modelo `Qwen/Qwen2.5-3B-Instruct` deve estar disponível. Verifique:

```bash
# Conectar na VM
gcloud compute ssh llm-chat-gpu --zone=us-central1-b

# Verificar modelos disponíveis
curl http://localhost:8000/v1/models
```

**Deve retornar:**
```json
{
  "data": [
    {
      "id": "Qwen/Qwen2.5-3B-Instruct",
      ...
    }
  ]
}
```

### 2. Verificar Logs do vLLM

Quando o erro 400 ocorrer, verifique os logs do vLLM:

```bash
gcloud compute ssh llm-chat-gpu --zone=us-central1-b --command="docker logs vllm-chat --tail 50 | grep -i 'error\|400\|bad'"
```

### 3. Verificar Parâmetros Enviados

Os logs do `ai-orchestrator` agora mostram:
- URL da API
- Modelo usado
- Número de mensagens
- Número de tools
- Tamanho do system prompt

Procure por `[ai-orchestrator] API request:` nos logs do Supabase.

### 4. Possível Problema: Tool Calling

O vLLM pode não suportar tool calling da mesma forma que OpenAI. Se o erro 400 ocorrer frequentemente com tool calling, considere:

**Opção A**: Desabilitar tool calling temporariamente para testar
**Opção B**: Usar apenas Lovable AI para tool calling
**Opção C**: Verificar se o vLLM suporta tool calling (pode precisar de versão específica)

---

## 🐛 Debugging

### Ver Logs Detalhados

1. **Supabase Dashboard** > **Edge Functions** > **ai-orchestrator** > **Logs**
2. Procure por:
   - `[ai-orchestrator] Bad Request (400) from vLLM:` - mostra o erro completo
   - `[ai-orchestrator] API request:` - mostra detalhes da requisição
   - `[ai-orchestrator] Attempting fallback to Lovable AI...` - indica fallback

### Testar vLLM Diretamente

Teste se o vLLM aceita requisições simples:

```bash
curl -X POST http://34.41.3.173:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dummy" \
  -d '{
    "model": "Qwen/Qwen2.5-3B-Instruct",
    "messages": [
      {"role": "user", "content": "Olá"}
    ],
    "stream": false
  }'
```

Se isso funcionar, o problema pode ser com:
- Tool calling
- System prompt muito longo
- Múltiplas mensagens

---

## 🔄 Fallback Automático

Com a correção implementada:

1. **Se vLLM retornar 400**: Sistema tenta automaticamente Lovable AI
2. **Se Lovable também falhar**: Retorna mensagem amigável ao usuário
3. **Logs detalhados**: Ajudam a identificar a causa raiz

---

## 📝 Próximos Passos

1. **Monitorar logs** após o deploy da correção
2. **Identificar padrão**: Quando o erro 400 ocorre (tool calling? mensagens longas?)
3. **Ajustar conforme necessário**: Pode precisar ajustar parâmetros ou desabilitar tool calling no vLLM

---

## ⚠️ Nota sobre Tool Calling

O vLLM pode ter limitações com tool calling. Se o erro 400 ocorrer principalmente quando tools são chamados, considere:

- Usar Lovable AI apenas para tool calling
- Ou verificar se o vLLM suporta tool calling (pode precisar de configuração especial)

---

**Última atualização:** 2026-01-28
