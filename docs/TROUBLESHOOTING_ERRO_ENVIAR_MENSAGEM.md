# Troubleshooting: Erro "Não foi possível enviar a mensagem"

**Data:** 2026-01-30  
**Problema:** Chat não envia mensagens, aparece erro "Não foi possível enviar a mensagem"

---

## 🔍 Situação Atual

- ✅ Requisição OPTIONS (CORS preflight) está chegando
- ❌ Requisição POST não está chegando na função
- ❌ Erro genérico no frontend: "Não foi possível enviar a mensagem"

---

## 🔍 Possíveis Causas

### 1. Erro de Rede ou CORS

**Sintomas:**
- Requisição POST falha antes de chegar na função
- Erro no console do navegador sobre CORS ou rede

**Verificação:**
1. Abra DevTools (F12) > **Network**
2. Envie uma mensagem no chat
3. Procure por requisição para `/functions/v1/ai-orchestrator`
4. Verifique se há erro de CORS (vermelho) ou falha de rede

**Solução:**
- Verificar se a URL do Supabase está correta
- Verificar se há problemas de CORS (mas OPTIONS está funcionando, então provavelmente não é isso)

### 2. Erro no Parsing do Request Body

**Sintomas:**
- Requisição POST chega mas falha no parsing
- Logs mostram "Failed to parse request body"

**Verificação:**
- Verificar logs do Supabase para ver se aparece "Failed to parse request body"

**Solução:**
- Verificar se o payload do frontend está correto
- Verificar se há caracteres especiais ou encoding incorreto

### 3. Erro Silencioso na Função

**Sintomas:**
- Função pode estar falhando mas não logando
- Erro sendo capturado mas não exibido

**Verificação:**
- Verificar logs do Supabase para ver se há erros não capturados
- Verificar se há "FATAL ERROR" nos logs

**Solução:**
- Os logs melhorados devem mostrar o erro agora

### 4. Problema com Autenticação

**Sintomas:**
- Token JWT pode estar inválido ou expirado
- Função pode estar rejeitando antes de processar

**Verificação:**
- Verificar se o usuário está autenticado
- Verificar se o token está sendo enviado no header

**Solução:**
- Fazer logout e login novamente
- Verificar se o token está válido

---

## ✅ Melhorias Implementadas

### 1. Logs Melhorados no Backend

- ✅ Logs detalhados no início da função
- ✅ Tratamento de erro no parsing do body
- ✅ Logs de erro mais detalhados com stack trace

### 2. Tratamento de Erro Melhorado no Frontend

- ✅ Captura e exibe mensagem de erro específica
- ✅ Logs detalhados no console
- ✅ Tratamento específico para erro 400

---

## 🔧 Passos para Diagnosticar

### Passo 1: Verificar Console do Navegador

1. Abra DevTools (F12)
2. Vá na aba **Console**
3. Envie uma mensagem no chat
4. Procure por erros (vermelho)
5. Procure por logs começando com `[useUnifiedAIChat]`

**O que procurar:**
- Erros de rede (Failed to fetch, Network error)
- Erros de CORS
- Erros de autenticação
- Logs de erro detalhados

### Passo 2: Verificar Network Tab

1. Abra DevTools (F12) > **Network**
2. Envie uma mensagem no chat
3. Procure por requisição para `ai-orchestrator`
4. Clique na requisição e verifique:
   - **Status:** Deve ser 200 (ou erro específico)
   - **Headers:** Verificar se Authorization está presente
   - **Payload:** Verificar se o body está correto
   - **Response:** Verificar se há mensagem de erro

### Passo 3: Verificar Logs do Supabase

1. Supabase Dashboard > **Edge Functions** > **ai-orchestrator** > **Logs**
2. Procure por:
   - `REQUEST RECEIVED` - Confirma que a função foi chamada
   - `Method: POST` - Confirma que é requisição POST
   - `Parsing request body...` - Confirma que está tentando parsear
   - `FATAL ERROR` - Mostra erros não capturados

### Passo 4: Verificar Autenticação

1. Verifique se o usuário está logado
2. Verifique se o token JWT está válido
3. Tente fazer logout e login novamente

---

## 📝 Checklist de Verificação

- [ ] Console do navegador verificado (sem erros de rede/CORS)
- [ ] Network tab verificado (requisição POST está sendo feita)
- [ ] Logs do Supabase verificados (função está sendo chamada)
- [ ] Autenticação verificada (usuário logado, token válido)
- [ ] Payload verificado (body da requisição está correto)
- [ ] Versão com logs melhorados foi deployada

---

## 🚀 Próximos Passos

1. **Fazer deploy** da versão com logs melhorados
2. **Testar o chat** novamente
3. **Verificar console do navegador** para ver erros específicos
4. **Verificar logs do Supabase** para ver se a função está sendo chamada
5. **Compartilhar logs** se o problema persistir

---

**Última atualização:** 2026-01-30  
**Status:** Aguardando deploy e testes
