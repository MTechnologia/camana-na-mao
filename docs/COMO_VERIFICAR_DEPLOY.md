# Como Verificar se o Deploy Foi Feito

**Data:** 2026-01-30  
**Objetivo:** Garantir que a versão mais recente da Edge Function está em produção

---

## ✅ Métodos de Verificação

### Método 1: Verificar Log de Versão (Mais Confiável)

Após fazer deploy, envie uma mensagem no chat e verifique os logs:

1. **Acesse Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Selecione projeto: `vjzkzsczlbtmrzewffdx`

2. **Acesse Logs**
   - **Edge Functions** > **ai-orchestrator** > **Logs**

3. **Procure por:**
   ```
   [ai-orchestrator] DEPLOY VERSION: 2026-01-30-v2 (melhorias de linguagem e saudações)
   ```

   **Se aparecer:** ✅ Deploy foi feito com sucesso!
   
   **Se não aparecer:** ❌ Deploy não foi feito ou versão antiga ainda está ativa

### Método 2: Verificar Data/Hora do Último Deploy

1. **Supabase Dashboard** > **Edge Functions** > **ai-orchestrator**
2. Verifique a **data/hora do último deploy**
3. Deve ser **mais recente** que o último commit

### Método 3: Verificar Comportamento

Teste funcionalidades novas:
- Envie uma saudação: "Olá, boa tarde"
- A IA deve responder à saudação de forma simpática
- Se não responder, o deploy pode não ter sido feito

---

## 🚀 Como Fazer Deploy

### Via Supabase Dashboard (Recomendado)

1. **Acesse:** https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx
2. **Vá em:** **Edge Functions** > **ai-orchestrator**
3. **Clique em:** **Deploy** ou **Redeploy**
4. **Aguarde:** 1-2 minutos para o deploy completar

### Via CLI

```bash
# Na raiz do projeto
supabase functions deploy ai-orchestrator

# ou com npx
npx supabase@latest functions deploy ai-orchestrator
```

**Verificar se funcionou:**
```bash
# Deve mostrar mensagem de sucesso
# Exemplo: "Deployed Function ai-orchestrator"
```

---

## 🔍 Checklist de Verificação

Após fazer deploy:

- [ ] Deploy executado (Dashboard ou CLI)
- [ ] Mensagem de sucesso apareceu
- [ ] Aguardado 1-2 minutos
- [ ] Enviado mensagem no chat
- [ ] Verificado logs do Supabase
- [ ] Log mostra: `DEPLOY VERSION: 2026-01-30-v2`
- [ ] Comportamento novo está funcionando (ex: resposta a saudações)

---

## ⚠️ Problemas Comuns

### Deploy não atualiza

**Sintomas:**
- Log não mostra versão nova
- Comportamento antigo ainda aparece

**Soluções:**
1. **Aguardar mais tempo** (pode levar até 3 minutos)
2. **Fazer deploy novamente** (às vezes precisa de 2 tentativas)
3. **Limpar cache do navegador** (Ctrl+Shift+R ou Cmd+Shift+R)
4. **Verificar se está no projeto correto** (`vjzkzsczlbtmrzewffdx`)

### Versão antiga ainda aparece

**Causa:** Cache ou múltiplas instâncias

**Solução:**
1. Aguarde 3-5 minutos após deploy
2. Faça logout e login novamente no app
3. Limpe localStorage do navegador
4. Teste em modo anônimo/privado

### Deploy falha

**Sintomas:**
- Erro ao fazer deploy
- Mensagem de erro no Dashboard

**Soluções:**
1. Verifique se tem permissão de admin
2. Verifique se o código tem erros de sintaxe
3. Tente fazer deploy via CLI para ver erro detalhado

---

## 📋 Exemplo de Log Correto

Após deploy bem-sucedido, os logs devem mostrar:

```
[ai-orchestrator] ========== REQUEST RECEIVED ==========
[ai-orchestrator] DEPLOY VERSION: 2026-01-30-v2 (melhorias de linguagem e saudações)
[ai-orchestrator] Request started at 2026-01-30T21:15:00.000Z
[ai-orchestrator] Method: POST
[ai-orchestrator] URL: http://vjzkzsczlbtmrzewffdx.supabase.co/ai-orchestrator
[ai-orchestrator] Validating authentication...
[ai-orchestrator] User authenticated: 57a96bf3-f0a2-454f-b6c6-99358b1ef8dc
[ai-orchestrator] Parsing request body...
```

---

## 🎯 Verificação Rápida

**Teste rápido:**
1. Envie: "Olá, boa tarde"
2. A IA deve responder: "Olá! Boa tarde! Como posso ajudar?"
3. Se responder assim: ✅ Deploy funcionou!
4. Se não responder à saudação: ❌ Deploy não foi feito ou versão antiga

---

**Última atualização:** 2026-01-30  
**Versão atual:** 2026-01-30-v2
