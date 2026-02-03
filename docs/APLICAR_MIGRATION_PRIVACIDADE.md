# Como Aplicar a Migration de Privacidade

## ⚠️ Importante

A migration `20260202000000_profile_privacy_system.sql` precisa ser aplicada no banco de dados Supabase para que o sistema de privacidade funcione corretamente.

---

## 📋 Métodos para Aplicar a Migration

### Método 1: Via Supabase Dashboard (Recomendado)

1. **Acesse o Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Selecione seu projeto

2. **Vá em SQL Editor:**
   - Clique em "SQL Editor" no menu lateral

3. **Cole o conteúdo da migration:**
   - Abra o arquivo: `supabase/migrations/20260202000000_profile_privacy_system.sql`
   - Copie todo o conteúdo
   - Cole no SQL Editor

4. **Execute:**
   - Clique em "Run" ou pressione `Ctrl+Enter`
   - Verifique se não há erros

### Método 2: Via Supabase CLI

```bash
# Certifique-se de estar na pasta do projeto
cd c:\Projetos\camana-na-mao

# Link com o projeto (se ainda não fez)
supabase link --project-ref vjzkzsczlbtmrzewffdx

# Aplicar migration
supabase db push
```

---

## ✅ Verificar se a Migration foi Aplicada

### 1. Verificar se a função existe:

```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_public_profile';
```

Deve retornar uma linha com `get_public_profile` e `FUNCTION`.

### 2. Verificar se a política RLS foi atualizada:

```sql
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename = 'profiles'
  AND policyname = 'Users can view their own profile or public profiles';
```

Deve retornar uma linha.

### 3. Testar a função:

```sql
-- Substitua {seu-user-id} pelo seu User ID
SELECT public.get_public_profile('{seu-user-id}'::UUID);
```

---

## 🧪 Testar o Sistema de Privacidade

### Teste 1: Perfil Privado (Deslogado)

1. Configure seu perfil como "Privado" em `/perfil/preferencias`
2. Faça logout ou abra uma aba anônima
3. Acesse `/perfil/{seu-user-id}`
4. **Resultado esperado:** Mensagem de erro "Este perfil não está disponível publicamente"

### Teste 2: Perfil Público com E-mail/Telefone Ocultos

1. Configure seu perfil como "Público" em `/perfil/preferencias`
2. Configure "Mostrar E-mail" como `false`
3. Configure "Mostrar Telefone" como `false`
4. Faça logout ou abra uma aba anônima
5. Acesse `/perfil/{seu-user-id}`
6. **Resultado esperado:** 
   - Nome e avatar visíveis
   - E-mail e telefone mostrando "Não disponível publicamente"

### Teste 3: Perfil Público com Tudo Visível

1. Configure seu perfil como "Público"
2. Configure "Mostrar E-mail" como `true`
3. Configure "Mostrar Telefone" como `true`
4. Faça logout ou abra uma aba anônima
5. Acesse `/perfil/{seu-user-id}`
6. **Resultado esperado:** Todos os dados visíveis

---

## 🔍 Debug

Se ainda não estiver funcionando, verifique:

### 1. Console do Navegador

Abra o Console (`F12`) e verifique os logs:
- `[usePublicProfile] RPC Response:` - Deve mostrar a resposta da função
- `[usePublicProfile] Profile is private:` - Deve aparecer se o perfil for privado

### 2. Verificar Preferências no Banco

```sql
SELECT 
  user_id,
  profile_visibility,
  show_email,
  show_phone
FROM user_preferences
WHERE user_id = '{seu-user-id}';
```

### 3. Testar Função RPC Diretamente

```sql
-- Como usuário anônimo (sem autenticação)
SELECT public.get_public_profile('{seu-user-id}'::UUID);

-- Deve retornar:
-- {"error": "Perfil privado", "message": "Este perfil não está disponível publicamente"}
-- Se o perfil estiver configurado como privado
```

---

## 📝 Notas

- A migration precisa ser aplicada apenas uma vez
- Se já aplicou antes, pode executar novamente (usa `CREATE OR REPLACE`)
- A função RPC tem permissão para `authenticated` e `anon` (usuários anônimos)

---

## 🆘 Problemas Comuns

### Erro: "function get_public_profile does not exist"
- **Solução:** A migration não foi aplicada. Aplique usando um dos métodos acima.

### Erro: "permission denied for function get_public_profile"
- **Solução:** Verifique se as permissões GRANT foram aplicadas (linhas 124-125 da migration).

### Perfil privado ainda aparece quando deslogado
- **Solução:** 
  1. Verifique se a migration foi aplicada
  2. Verifique se as preferências estão salvas corretamente
  3. Verifique os logs no console do navegador
  4. Limpe o cache do navegador
