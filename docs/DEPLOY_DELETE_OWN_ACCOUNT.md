# Deploy da Função delete-own-account

**Data:** 2026-01-31  
**Função:** `delete-own-account`  
**Objetivo:** Permitir que usuários excluam sua própria conta (direito LGPD de exclusão)

---

## 📋 O que foi implementado

### Edge Function: `delete-own-account`

Localização: `supabase/functions/delete-own-account/index.ts`

**Funcionalidades:**
- Permite que usuários excluam sua própria conta
- Usa Admin API para deletar o usuário de `auth.users`
- Exclusão em cascata remove todos os dados relacionados (devido a foreign keys)
- Verificação manual de JWT (verify_jwt = false)

### Página Frontend: `/perfil/direitos`

Localização: `src/pages/profile/UserRightsPage.tsx`

**Funcionalidades:**
- Lista todos os direitos LGPD do titular
- Interface para exclusão de conta com confirmação obrigatória
- Links para outros direitos (acesso, portabilidade, correção, consentimentos)
- Dialog de confirmação com digitação obrigatória de "EXCLUIR"

---

## 🚀 Como Fazer Deploy

### Método 1: Via Supabase Dashboard (Recomendado)

1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Selecione projeto: `vjzkzsczlbtmrzewffdx`

2. **Acesse Edge Functions**
   - No menu lateral, clique em **Edge Functions**
   - Ou acesse: **Project Settings** > **Edge Functions**

3. **Criar/Deploy da Função**
   - Se a função não existir, clique em **Create Function**
   - Nome: `delete-own-account`
   - Se já existir, clique em **delete-own-account** > **Deploy** ou **Redeploy**
   - Aguarde o deploy completar (pode levar 1-2 minutos)

### Método 2: Via Supabase CLI

```bash
# 1. Fazer login (se necessário)
supabase login

# 2. Linkar ao projeto (se necessário)
supabase link --project-ref vjzkzsczlbtmrzewffdx

# 3. Fazer deploy da função
supabase functions deploy delete-own-account

# Ou com npx
npx supabase@latest functions deploy delete-own-account
```

---

## ✅ Verificar se o Deploy Funcionou

### 1. Verificar se a Função Existe

1. **Supabase Dashboard** > **Edge Functions**
2. Deve aparecer `delete-own-account` na lista
3. Verifique a **data/hora do último deploy**

### 2. Testar a Função

1. Acesse a aplicação: `/perfil/direitos`
2. Clique em **Excluir conta** no card "Exclusão de Conta"
3. Digite "EXCLUIR" no campo de confirmação
4. Clique em **Excluir Conta Permanentemente**
5. A conta deve ser excluída e você será redirecionado para a página inicial

### 3. Verificar Logs

1. **Edge Functions** > **delete-own-account** > **Logs**
2. Procure por:
   ```
   [delete-own-account] User <user-id> requesting account deletion
   [delete-own-account] User <user-id> deleted successfully
   ```

---

## 🔧 Configuração

### Config.toml

A função está configurada em `supabase/config.toml`:

```toml
[functions.delete-own-account]
verify_jwt = false
```

**Por quê `verify_jwt = false`?**
- A função faz verificação manual do JWT
- Permite mais controle sobre a autenticação
- Similar ao `suggest-council-members` e `export-user-data`

### Variáveis de Ambiente

A função usa as seguintes variáveis (já configuradas no Supabase):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (necessário para Admin API)

---

## 🗑️ O que é Excluído

Quando um usuário exclui sua conta, os seguintes dados são removidos automaticamente (devido a foreign keys com `ON DELETE CASCADE`):

1. **auth.users** - Conta de autenticação
2. **profiles** - Perfil do usuário
3. **user_demographics** - Dados demográficos
4. **user_addresses** - Endereços
5. **user_interests** - Interesses
6. **user_preferences** - Preferências
7. **user_consents** - Consentimentos
8. **urban_reports** - Relatos urbanos
9. **transport_reports** - Relatos de transporte
10. **service_ratings** - Avaliações de serviços
11. **ai_conversations** - Conversas com IA
12. **audiencia_participations** - Participações em audiências
13. **council_member_referrals** - Encaminhamentos para vereadores
14. E outros dados relacionados

---

## ⚠️ Avisos Importantes

### Exclusão Permanente

- ⚠️ **A exclusão é permanente e irreversível**
- ⚠️ **Todos os dados são removidos do sistema**
- ⚠️ **Não há como recuperar a conta após a exclusão**
- ⚠️ **Relatos, avaliações e histórico são perdidos permanentemente**

### Confirmação Obrigatória

A interface exige:
1. Clique no botão "Excluir conta"
2. Leitura das informações sobre o que será excluído
3. Digitação obrigatória de "EXCLUIR" no campo de confirmação
4. Clique final em "Excluir Conta Permanentemente"

Isso garante que o usuário entende completamente as consequências.

---

## 🔒 Segurança

### Verificação de Autenticação

A função verifica:
- ✅ Token JWT presente no header `Authorization`
- ✅ Token válido e não expirado
- ✅ Usuário autenticado
- ✅ Apenas o próprio usuário pode excluir sua conta

### Prevenção de Exclusão Acidental

- Confirmação obrigatória com digitação de "EXCLUIR"
- Dialog com informações claras sobre o que será excluído
- Botão de cancelamento sempre visível
- Avisos visuais sobre exclusão permanente

---

## 📝 Checklist de Deploy

- [ ] Código commitado e pushado para `dev`
- [ ] Função `delete-own-account` criada no Supabase
- [ ] Deploy da função executado (Dashboard ou CLI)
- [ ] Configuração `verify_jwt = false` no `config.toml` aplicada
- [ ] Rota `/perfil/direitos` adicionada no `App.tsx`
- [ ] Card "Meus Direitos LGPD" adicionado no `Profile.tsx`
- [ ] Testado acesso à página
- [ ] Testado dialog de exclusão (sem confirmar)
- [ ] Verificado que confirmação obrigatória funciona
- [ ] Verificado logs sem erros

---

## 🚀 Após o Deploy

1. **Teste a funcionalidade:**
   - Acesse `/perfil/direitos`
   - Verifique se todos os direitos estão listados
   - Teste o dialog de exclusão (sem confirmar)

2. **Teste a exclusão (em ambiente de teste):**
   - Crie uma conta de teste
   - Acesse `/perfil/direitos`
   - Clique em "Excluir conta"
   - Digite "EXCLUIR" e confirme
   - Verifique se a conta foi excluída

3. **Monitore os logs:**
   - Verifique se não há erros nos logs
   - Monitore por alguns minutos após o deploy

---

## 🔄 Diferença entre `delete-user` e `delete-own-account`

### `delete-user` (existente)
- **Uso:** Admins excluírem outros usuários
- **Verificação:** Requer role `admin`
- **Prevenção:** Não permite auto-exclusão

### `delete-own-account` (novo)
- **Uso:** Usuários excluírem sua própria conta
- **Verificação:** Apenas verifica que o usuário está autenticado
- **LGPD:** Garante direito de exclusão do titular

---

**Última atualização:** 2026-01-31  
**Status:** Pronto para deploy
