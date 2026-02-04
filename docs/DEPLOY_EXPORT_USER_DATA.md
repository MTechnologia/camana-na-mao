# Deploy da Função export-user-data

**Data:** 2026-01-31  
**Função:** `export-user-data`  
**Objetivo:** Permitir que usuários exportem seus dados pessoais (portabilidade LGPD)

---

## 📋 O que foi implementado

### Edge Function: `export-user-data`

Localização: `supabase/functions/export-user-data/index.ts`

**Funcionalidades:**
- Exporta todos os dados pessoais do usuário em formato JSON
- Inclui: conta, perfil, demografia, endereços, relatos, avaliações, consentimentos, preferências, conversas, participações
- Verificação manual de JWT (verify_jwt = false)
- Formato estruturado e legível

### Página Frontend: `/perfil/exportar-dados`

Localização: `src/pages/profile/DataExportPage.tsx`

**Funcionalidades:**
- Interface para solicitar exportação
- Download automático do arquivo JSON
- Informações sobre portabilidade LGPD
- Lista de categorias de dados incluídas

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
   - Nome: `export-user-data`
   - Se já existir, clique em **export-user-data** > **Deploy** ou **Redeploy**
   - Aguarde o deploy completar (pode levar 1-2 minutos)

### Método 2: Via Supabase CLI

```bash
# 1. Fazer login (se necessário)
supabase login

# 2. Linkar ao projeto (se necessário)
supabase link --project-ref vjzkzsczlbtmrzewffdx

# 3. Fazer deploy da função
supabase functions deploy export-user-data

# Ou com npx
npx supabase@latest functions deploy export-user-data
```

---

## ✅ Verificar se o Deploy Funcionou

### 1. Verificar se a Função Existe

1. **Supabase Dashboard** > **Edge Functions**
2. Deve aparecer `export-user-data` na lista
3. Verifique a **data/hora do último deploy**

### 2. Testar a Função

1. Acesse a aplicação: `/perfil/exportar-dados`
2. Clique em **Exportar dados (JSON)**
3. Deve fazer download de um arquivo JSON com seus dados
4. Verifique os logs no Supabase Dashboard para erros

### 3. Verificar Logs

1. **Edge Functions** > **export-user-data** > **Logs**
2. Procure por:
   ```
   [export-user-data] Exporting data for user: <user-id>
   [export-user-data] Export completed for user: <user-id>
   ```

---

## 🔧 Configuração

### Config.toml

A função está configurada em `supabase/config.toml`:

```toml
[functions.export-user-data]
verify_jwt = false
```

**Por quê `verify_jwt = false`?**
- A função faz verificação manual do JWT
- Permite mais controle sobre a autenticação
- Similar ao `suggest-council-members`

### Variáveis de Ambiente

A função usa as seguintes variáveis (já configuradas no Supabase):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

---

## 📊 Dados Exportados

A exportação inclui:

1. **Account** - Email, telefone, datas de criação/login
2. **Profile** - Nome, foto, biografia
3. **Demographics** - Idade, gênero, raça, classe social
4. **Addresses** - Todos os endereços cadastrados
5. **Interests** - Categorias de interesse
6. **Preferences** - Configurações de privacidade e notificações
7. **Consents** - Histórico de consentimentos LGPD
8. **Reports** - Relatos urbanos e de transporte
9. **Ratings** - Avaliações de serviços públicos
10. **Conversations** - Histórico de conversas com IA (últimas 100)
11. **Participations** - Participações em audiências
12. **Referrals** - Encaminhamentos para vereadores

---

## ⚠️ Problemas Comuns

### Erro 401 (Unauthorized)

**Causa:** Token de autenticação inválido ou expirado

**Solução:**
1. Verifique se o usuário está logado
2. Tente fazer logout e login novamente
3. Verifique os logs da função para mais detalhes

### Erro 500 (Internal Server Error)

**Causa:** Erro ao buscar dados ou problema na função

**Solução:**
1. Verifique os logs da função no Supabase Dashboard
2. Verifique se todas as tabelas existem
3. Verifique se as RLS policies permitem leitura dos dados

### Download não inicia

**Causa:** Problema no frontend ou resposta da função

**Solução:**
1. Abra o console do navegador (F12)
2. Verifique erros no console
3. Verifique a resposta da função no Network tab

---

## 🔒 Segurança

### Verificação de Autenticação

A função verifica:
- ✅ Token JWT presente no header `Authorization`
- ✅ Token válido e não expirado
- ✅ Usuário autenticado

### Dados Sensíveis

- Apenas o próprio usuário pode exportar seus dados
- RLS policies garantem que apenas dados do usuário são retornados
- Nenhum dado é compartilhado com terceiros

---

## 📝 Checklist de Deploy

- [ ] Código commitado e pushado para `dev`
- [ ] Função `export-user-data` criada no Supabase
- [ ] Deploy da função executado (Dashboard ou CLI)
- [ ] Configuração `verify_jwt = false` no `config.toml` aplicada
- [ ] Rota `/perfil/exportar-dados` adicionada no `App.tsx`
- [ ] Card "Exportar Dados" adicionado no `Profile.tsx`
- [ ] Testado acesso à página
- [ ] Testado exportação de dados
- [ ] Verificado download do arquivo JSON
- [ ] Verificado logs sem erros

---

## 🚀 Após o Deploy

1. **Teste a funcionalidade:**
   - Acesse `/perfil/exportar-dados`
   - Clique em **Exportar dados (JSON)**
   - Verifique se o download funciona

2. **Verifique os dados:**
   - Abra o arquivo JSON baixado
   - Verifique se todos os dados esperados estão presentes
   - Verifique se o formato está correto

3. **Monitore os logs:**
   - Verifique se não há erros nos logs
   - Monitore por alguns minutos após o deploy

---

**Última atualização:** 2026-01-31  
**Status:** Pronto para deploy
