# Troubleshooting: Sem Logs Após Deploy

**Data:** 2026-01-30  
**Problema:** Após deploy, não aparecem mais logs no Supabase

---

## 🔍 Possíveis Causas

### 1. Função Não Está Sendo Chamada

**Sintomas:**
- Nenhum log aparece
- Chat não responde
- Frontend pode estar chamando URL errada

**Verificação:**
1. Abra o DevTools do navegador (F12)
2. Vá na aba **Network**
3. Envie uma mensagem no chat
4. Procure por requisições para `/functions/v1/ai-orchestrator`
5. Verifique se há requisições sendo feitas

**Solução:**
- Verificar se a URL da função está correta no frontend
- Verificar se há erros de CORS
- Verificar se o usuário está autenticado

---

### 2. Erro Antes dos Logs

**Sintomas:**
- Função pode estar falhando antes do primeiro `console.log`
- Pode ser erro de sintaxe ou import

**Verificação:**
1. No Supabase Dashboard, vá em **Edge Functions** > **ai-orchestrator**
2. Verifique se há erros de **deployment**
3. Procure por mensagens de erro na página da função

**Solução:**
- Verificar se o deploy foi bem-sucedido
- Verificar se há erros de sintaxe no código
- Tentar fazer deploy novamente

---

### 3. Logs Não Estão Sendo Exibidos

**Sintomas:**
- Função pode estar funcionando, mas logs não aparecem
- Pode ser problema de visualização no dashboard

**Verificação:**
1. No Supabase Dashboard, vá em **Edge Functions** > **ai-orchestrator** > **Logs**
2. Verifique se está filtrando por data/hora correta
3. Tente limpar os filtros
4. Verifique se está na aba correta (Logs, não Invocations)

**Solução:**
- Limpar filtros de data/hora
- Verificar se está na aba correta
- Tentar recarregar a página

---

### 4. Secrets Não Configurados

**Sintomas:**
- Função pode estar retornando erro silencioso
- Pode estar retornando mensagem de erro ao usuário

**Verificação:**
1. No Supabase Dashboard, vá em **Project Settings** > **Edge Functions** > **Secrets**
2. Verifique se os seguintes secrets existem:
   - `AI_CHAT_BASE_URL` ou `AI_BASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

**Solução:**
- Adicionar os secrets faltantes
- Aguardar 1-2 minutos para propagação
- Testar novamente

---

### 5. Função Está Retornando Erro Silencioso

**Sintomas:**
- Função pode estar capturando erros e retornando sem log

**Verificação:**
- Com os novos logs adicionados, deve aparecer:
  - `[ai-orchestrator] ========== REQUEST RECEIVED ==========`
  - `[ai-orchestrator] Method: POST`
  - `[ai-orchestrator] Parsing request body...`

**Solução:**
- Fazer deploy da versão com logs melhorados
- Verificar os logs novamente

---

## ✅ Logs Adicionados para Diagnóstico

Adicionei logs mais detalhados no início da função:

```typescript
console.log('[ai-orchestrator] ========== REQUEST RECEIVED ==========');
console.log('[ai-orchestrator] Request started at', new Date().toISOString());
console.log('[ai-orchestrator] Method:', req.method);
console.log('[ai-orchestrator] URL:', req.url);
console.log('[ai-orchestrator] Parsing request body...');
console.log('[ai-orchestrator] Environment check:', { ... });
```

**O que procurar nos logs:**
1. `REQUEST RECEIVED` - Confirma que a função foi chamada
2. `Method: POST` - Confirma o método HTTP
3. `Parsing request body...` - Confirma que está tentando parsear
4. `Environment check` - Mostra quais secrets estão configurados

---

## 🔧 Passos para Diagnosticar

### Passo 1: Verificar se o Deploy Foi Bem-Sucedido

1. Supabase Dashboard > **Edge Functions** > **ai-orchestrator**
2. Verifique se há mensagem de sucesso
3. Verifique a data/hora do último deploy

### Passo 2: Fazer Deploy da Versão com Logs Melhorados

```bash
# Se usando CLI
supabase functions deploy ai-orchestrator

# Ou via Dashboard
# Edge Functions > ai-orchestrator > Deploy
```

### Passo 3: Testar e Verificar Logs

1. Envie uma mensagem no chat
2. Aguarde 10-15 segundos
3. Vá em **Edge Functions** > **ai-orchestrator** > **Logs**
4. Procure por `REQUEST RECEIVED`

### Passo 4: Verificar Secrets

1. **Project Settings** > **Edge Functions** > **Secrets**
2. Verifique se existem:
   - ✅ `AI_CHAT_BASE_URL` = `http://34.71.221.107:8000/v1`
   - ✅ `SUPABASE_URL` = (deve estar configurado)
   - ✅ `SUPABASE_ANON_KEY` = (deve estar configurado)

---

## 📝 Checklist de Verificação

- [ ] Deploy foi bem-sucedido
- [ ] Secrets estão configurados
- [ ] Frontend está fazendo requisições (verificar Network tab)
- [ ] Logs estão sendo visualizados corretamente (sem filtros)
- [ ] Versão com logs melhorados foi deployada
- [ ] Teste foi feito após o deploy

---

## 🚀 Próximos Passos

1. **Fazer deploy da versão com logs melhorados**
2. **Testar o chat novamente**
3. **Verificar os logs no Supabase**
4. **Compartilhar os logs** se ainda não aparecerem

---

**Última atualização:** 2026-01-30  
**Status:** Aguardando deploy da versão com logs melhorados
