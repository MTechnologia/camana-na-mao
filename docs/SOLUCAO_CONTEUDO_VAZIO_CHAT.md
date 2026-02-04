# Solução: Conteúdo Vazio no Chat

**Data:** 2026-01-30  
**Status:** ✅ Corrigido

---

## 🔍 Problema Identificado

O log do Supabase mostrava que o conteúdo parseado estava vazio:

```json
{
  "event_message": "[ai-orchestrator] Parsed content: \n",
  ...
}
```

### Causa Raiz

O problema ocorria quando:
1. O LLM (Lovable AI Gateway) retornava uma resposta vazia no stream SSE
2. O stream continha apenas tool calls sem conteúdo de texto
3. O parsing do SSE falhava silenciosamente

Quando `fullContent` estava vazio e não havia tool call, o código enviava uma resposta vazia ao frontend, causando:
- Chat sem resposta visível
- Experiência do usuário quebrada
- Fluxo de conversação interrompido

---

## ✅ Solução Implementada

### 1. Tratamento de Conteúdo Vazio

Adicionado tratamento para quando `fullContent` está vazio:

```typescript
// CRITICAL FIX: Handle empty content case
if (!responseContent || responseContent.trim() === '') {
  console.warn('[ai-orchestrator] Empty content received from LLM, using fallback message');
  
  // If we have a collection intent, ask for the next field
  if (collectionIntent && nextFieldInfo.field) {
    const fieldsJson = JSON.stringify(accumulatedFields);
    const progressMarker = `[COLLECTION_PROGRESS:${collectionIntent.type}:${fieldsJson}]`;
    const fieldMarker = `[FIELD_REQUEST:${nextFieldInfo.field}]`;
    const pickerMarker = nextFieldInfo.picker || '';
    responseContent = `${progressMarker}${fieldMarker}${nextFieldInfo.prompt}${pickerMarker ? '\n\n' + pickerMarker : ''}`;
  } else {
    // Generic fallback message
    responseContent = 'Desculpe, não consegui processar sua mensagem. Pode reformular?';
  }
}
```

**Comportamento:**
- Se houver um `collectionIntent` ativo, usa o `nextFieldInfo` para continuar o fluxo
- Caso contrário, retorna uma mensagem genérica pedindo reformulação

### 2. Logs Melhorados para Diagnóstico

Adicionados logs detalhados para diagnosticar problemas no parsing do stream:

```typescript
console.log('[ai-orchestrator] Stream parsing stats:', {
  totalEvents: parsedEvents,
  contentEvents,
  toolCallEvents,
  contentLength: fullContent.length,
  hasToolCall: !!toolCallData?.name
});
```

**Benefícios:**
- Facilita identificar se o problema é no parsing ou na resposta do LLM
- Mostra quantos eventos de conteúdo vs tool calls foram recebidos
- Ajuda a entender se o stream está malformado

---

## 📊 Impacto

### Antes da Correção:
- ❌ Chat podia ficar sem resposta
- ❌ Usuário via mensagem vazia
- ❌ Fluxo de conversação interrompido

### Depois da Correção:
- ✅ Sempre há uma resposta válida
- ✅ Se houver collection intent, continua o fluxo automaticamente
- ✅ Mensagem de fallback amigável quando necessário
- ✅ Logs detalhados para diagnóstico futuro

---

## 🔍 Como Verificar se Está Funcionando

### 1. Verificar Logs do Supabase

No Supabase Dashboard:
- **Edge Functions** > **ai-orchestrator** > **Logs**
- Procure por:
  - `[ai-orchestrator] Stream parsing stats:` - mostra estatísticas do parsing
  - `[ai-orchestrator] Empty content received` - indica que o fallback foi usado

### 2. Testar no Chat

1. Envie uma mensagem no chat
2. Verifique se sempre recebe uma resposta (mesmo que seja o fallback)
3. Se estiver em um fluxo estruturado (relato urbano, transporte, etc.), verifique se continua perguntando o próximo campo

### 3. Monitorar Frequência

Se o problema persistir frequentemente:
- Verifique se o Lovable AI Gateway está retornando respostas válidas
- Verifique se há problemas de conectividade
- Considere adicionar retry logic ou fallback para outro provider

---

## 🚀 Próximos Passos (Opcional)

### Melhorias Futuras:

1. **Retry Logic**: Se o conteúdo estiver vazio, tentar novamente a requisição
2. **Fallback Provider**: Se Lovable falhar, usar vLLM como fallback
3. **Alertas**: Notificar quando o problema ocorrer com frequência
4. **Cache de Respostas**: Para perguntas comuns, usar cache

---

## 📝 Arquivos Modificados

- `supabase/functions/ai-orchestrator/index.ts`
  - Adicionado tratamento de conteúdo vazio (linha ~5955)
  - Adicionados logs de diagnóstico (linha ~5850)

---

**Última atualização:** 2026-01-30  
**Status:** ✅ Implementado e testado
