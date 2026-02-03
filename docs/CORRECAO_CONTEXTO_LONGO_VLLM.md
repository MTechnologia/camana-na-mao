# Correção: Contexto Muito Longo no vLLM

**Data:** 2026-01-28  
**Problema:** Erro 400 - `maximum context length is 4096 tokens. However, your request has 9069 input tokens`

---

## 🔍 Problema Identificado

O vLLM retornou erro 400 porque:
- **Limite do modelo**: 4096 tokens
- **Requisição enviada**: 9069 tokens
- **Causa**: System prompt muito longo + 10 mensagens de histórico + tools

---

## ✅ Correções Implementadas

### 1. Redução de Mensagens de Histórico

**Antes:**
```typescript
...messages.slice(-10) // Last 10 messages
```

**Depois:**
```typescript
const maxMessages = 5; // Reduced from 10
...messages.slice(-maxMessages)
```

### 2. Truncamento do System Prompt

**Adicionado:**
```typescript
let truncatedSystemPrompt = dynamicSystemPrompt;
const maxSystemPromptChars = 6000; // ~1500 tokens
if (truncatedSystemPrompt.length > maxSystemPromptChars) {
  truncatedSystemPrompt = truncatedSystemPrompt.substring(0, maxSystemPromptChars) + '\n\n[Prompt truncado para economizar tokens]';
}
```

### 3. Retry com Contexto Reduzido

Quando detecta erro de contexto muito longo:
- Tenta novamente com apenas **3 mensagens**
- Trunca system prompt para **4000 caracteres**
- Limita tools para **10 primeiros**

### 4. Fallback Automático

Se o retry falhar:
- Tenta **Lovable AI** (que suporta mais contexto)
- Retorna mensagem amigável se ambos falharem

---

## 📊 Estimativa de Tokens

**Antes (9069 tokens):**
- System prompt: ~2000 tokens
- 10 mensagens: ~5000 tokens
- Tools: ~2000 tokens
- **Total: ~9000 tokens** ❌

**Depois (estimado ~3000 tokens):**
- System prompt truncado: ~1500 tokens
- 5 mensagens: ~1500 tokens
- Tools: ~1000 tokens
- **Total: ~4000 tokens** ✅ (dentro do limite)

---

## 🔄 Fluxo de Tratamento de Erro

```
1. Tenta com 5 mensagens + system prompt truncado
   ↓ (se erro 400 - contexto muito longo)
2. Tenta com 3 mensagens + system prompt ainda menor
   ↓ (se ainda falhar)
3. Tenta Lovable AI (suporta mais contexto)
   ↓ (se falhar)
4. Retorna mensagem amigável ao usuário
```

---

## ⚙️ Configuração Atual

### vLLM Container

```bash
--max-model-len 4096  # Limite de tokens do modelo
```

### ai-orchestrator

```typescript
const maxMessages = 5; // Mensagens de histórico
const maxSystemPromptChars = 6000; // ~1500 tokens
```

---

## 🔧 Ajustes Futuros (Se Necessário)

### Opção 1: Aumentar max_model_len

**Prós:**
- Suporta conversas mais longas
- Menos truncamento

**Contras:**
- Pode causar problemas de memória
- Pode não caber na GPU T4

**Comando:**
```bash
--max-model-len 8192  # Aumenta limite para 8192 tokens
```

### Opção 2: Usar Modelo Maior

Trocar para modelo com mais contexto:
- `Qwen/Qwen2.5-7B-Instruct` (suporta mais tokens, mas pode não caber na T4)
- Ou usar Lovable AI para conversas longas

### Opção 3: Implementar Resumo de Conversa

Para conversas muito longas:
- Resumir mensagens antigas
- Manter apenas últimas mensagens + resumo

---

## 📝 Logs para Monitoramento

Após o deploy, monitore os logs para:

1. **Frequência de truncamento:**
   ```
   [ai-orchestrator] System prompt too long, truncating from X to 6000
   ```

2. **Retries com contexto reduzido:**
   ```
   [ai-orchestrator] Context too long, attempting with reduced context...
   [ai-orchestrator] Retry with reduced context successful
   ```

3. **Fallbacks para Lovable:**
   ```
   [ai-orchestrator] Attempting fallback to Lovable AI...
   [ai-orchestrator] Fallback to Lovable successful
   ```

---

## ✅ Resultado Esperado

Com essas correções:

1. **Maioria das requisições**: Funcionam com 5 mensagens
2. **Conversas longas**: Retry automático com 3 mensagens
3. **Casos extremos**: Fallback para Lovable AI
4. **Usuário**: Sempre recebe resposta (não crasha)

---

## 🐛 Troubleshooting

### Se ainda der erro 400

1. **Verifique logs** para ver se está truncando corretamente
2. **Reduza ainda mais** o número de mensagens (de 5 para 3)
3. **Aumente max_model_len** no container (se houver memória)
4. **Use Lovable AI** como principal para conversas longas

### Se performance piorar

- O truncamento pode afetar a qualidade das respostas
- Considere aumentar `max_model_len` no vLLM
- Ou usar Lovable AI para conversas mais longas

---

**Última atualização:** 2026-01-28
