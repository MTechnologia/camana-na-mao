# Sistema de Privacidade de Perfil

## 📋 Resumo

Sistema de privacidade implementado para controlar a visibilidade de dados do perfil do usuário. Permite que usuários configurem se seu perfil é público, privado ou apenas para amigos, e se desejam exibir e-mail e telefone publicamente.

---

## ✅ O que foi implementado

### 1. **Função RPC no Banco de Dados**
- **Arquivo:** `supabase/migrations/20260202000000_profile_privacy_system.sql`
- **Função:** `get_public_profile(target_user_id UUID)`
- **Funcionalidade:**
  - Verifica `profile_visibility` antes de retornar dados
  - Verifica `show_email` antes de retornar e-mail
  - Verifica `show_phone` antes de retornar telefone
  - Retorna erro se perfil é privado e usuário não é o dono
  - Sempre permite que o usuário veja seu próprio perfil completo

### 2. **RLS Policies Atualizadas**
- **Política:** "Users can view their own profile or public profiles"
- **Funcionalidade:**
  - Usuários podem ver seu próprio perfil
  - Usuários podem ver perfis públicos de outros usuários
  - Perfis privados não são visíveis para outros usuários

### 3. **Hook `usePublicProfile`**
- **Arquivo:** `src/hooks/usePublicProfile.ts`
- **Funcionalidade:**
  - Busca perfil público usando função RPC
  - Retorna dados respeitando configurações de privacidade
  - Gerencia estados de loading e error

### 4. **Página de Perfil Público**
- **Arquivo:** `src/pages/profile/PublicProfilePage.tsx`
- **Rota:** `/perfil/:userId`
- **Funcionalidade:**
  - Exibe perfil público respeitando privacidade
  - Mostra/oculta e-mail baseado em `show_email`
  - Mostra/oculta telefone baseado em `show_phone`
  - Indica visibilidade do perfil (público/privado/amigos)
  - Permite edição se for o próprio perfil

### 5. **Função Utilitária**
- **Arquivo:** `src/lib/utils.ts`
- **Função:** `getInitials(name: string)`
- **Funcionalidade:** Gera iniciais do nome para avatares

---

## 🔧 Como usar

### Para usuários finais

1. **Configurar privacidade:**
   - Acesse: `/perfil/preferencias`
   - Configure "Visibilidade do Perfil" (Público/Privado/Amigos)
   - Configure "Mostrar E-mail" (ligado/desligado)
   - Configure "Mostrar Telefone" (ligado/desligado)
   - Clique em "Salvar Preferências"

2. **Visualizar perfil público:**
   - Acesse: `/perfil/{userId}`
   - O perfil será exibido respeitando as configurações de privacidade

### Para desenvolvedores

#### Buscar perfil público

```typescript
import { usePublicProfile } from "@/hooks/usePublicProfile";

const MyComponent = () => {
  const { profile, loading, error } = usePublicProfile(userId);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;
  if (!profile) return <div>Perfil não encontrado</div>;

  return (
    <div>
      <h1>{profile.full_name}</h1>
      {profile.email && <p>Email: {profile.email}</p>}
      {profile.phone && <p>Telefone: {profile.phone}</p>}
    </div>
  );
};
```

#### Chamar função RPC diretamente

```typescript
const { data, error } = await supabase.rpc('get_public_profile', {
  target_user_id: userId
});

if (error) {
  console.error('Erro:', error);
  return;
}

if (data && 'error' in data) {
  console.error('Erro do servidor:', data.message);
  return;
}

// data contém o perfil respeitando privacidade
const profile = data as PublicProfile;
```

---

## 📊 Configurações de Privacidade

### `profile_visibility`
- **`public`**: Perfil visível para todos
- **`private`**: Perfil visível apenas para o próprio usuário
- **`friends`**: Perfil visível apenas para amigos (TODO: implementar sistema de amigos)

### `show_email`
- **`true`**: E-mail visível no perfil público
- **`false`**: E-mail oculto no perfil público (sempre visível para o próprio usuário)

### `show_phone`
- **`true`**: Telefone visível no perfil público
- **`false`**: Telefone oculto no perfil público (sempre visível para o próprio usuário)

---

## 🔒 Segurança

### RLS (Row Level Security)
- Políticas RLS garantem que apenas perfis públicos sejam visíveis
- Usuários sempre podem ver seu próprio perfil completo
- Função RPC usa `SECURITY DEFINER` para acessar `auth.users` (necessário para buscar e-mail)

### Validação
- Função RPC valida todas as configurações de privacidade antes de retornar dados
- Retorna erro apropriado se perfil não está disponível
- Não expõe dados sensíveis mesmo em caso de erro

---

## 📝 Próximos Passos (TODO)

### 1. **Atualizar lugares onde perfis são exibidos**
- [ ] Comentários em relatórios (`src/components/urban/ReportComments.tsx`)
- [ ] Cards de relatórios (`src/pages/urban/ReportHistoryPage.tsx`)
- [ ] Outros lugares onde `profiles.full_name` é exibido

**Como fazer:**
- Usar `usePublicProfile` hook ou função RPC `get_public_profile`
- Verificar `profile_visibility` antes de exibir nome
- Verificar `show_email` e `show_phone` antes de exibir esses dados

### 2. **Sistema de Amigos**
- [ ] Criar tabela `user_friends` ou `friendships`
- [ ] Implementar lógica de "amigos" na função RPC
- [ ] Adicionar interface para gerenciar amigos

### 3. **Links para Perfil Público**
- [ ] Adicionar links clicáveis para perfil público em:
  - Comentários
  - Cards de relatórios
  - Listas de usuários

---

## 🧪 Testes

### Teste 1: Perfil Público
1. Configure perfil como "Público"
2. Configure "Mostrar E-mail" como `true`
3. Configure "Mostrar Telefone" como `true`
4. Acesse `/perfil/{seu-user-id}` em modo anônimo ou com outro usuário
5. Verifique se e-mail e telefone são exibidos

### Teste 2: Perfil Privado
1. Configure perfil como "Privado"
2. Acesse `/perfil/{seu-user-id}` com outro usuário
3. Verifique se aparece mensagem de erro "Perfil privado"

### Teste 3: Ocultar E-mail/Telefone
1. Configure perfil como "Público"
2. Configure "Mostrar E-mail" como `false`
3. Configure "Mostrar Telefone" como `false`
4. Acesse `/perfil/{seu-user-id}` com outro usuário
5. Verifique se e-mail e telefone não são exibidos

### Teste 4: Próprio Perfil
1. Configure perfil como "Privado"
2. Configure "Mostrar E-mail" como `false`
3. Configure "Mostrar Telefone" como `false`
4. Acesse `/perfil/{seu-user-id}` estando logado como o próprio usuário
5. Verifique se e-mail e telefone são exibidos (sempre visíveis para o próprio usuário)

---

## 📚 Arquivos Relacionados

### Backend
- `supabase/migrations/20260202000000_profile_privacy_system.sql` - Migration com função RPC e RLS
- `supabase/migrations/20251126040829_*.sql` - Tabela `user_preferences`

### Frontend
- `src/hooks/usePublicProfile.ts` - Hook para buscar perfil público
- `src/pages/profile/PublicProfilePage.tsx` - Página de perfil público
- `src/components/profile/PreferencesForm.tsx` - Formulário de preferências
- `src/lib/utils.ts` - Função `getInitials`

### Rotas
- `/perfil/:userId` - Perfil público
- `/perfil/preferencias` - Configurações de privacidade

---

## ⚠️ Notas Importantes

1. **E-mail vem de `auth.users`**: A função RPC precisa de `SECURITY DEFINER` para acessar `auth.users` e buscar o e-mail, pois essa tabela não é acessível diretamente via RLS.

2. **Padrão é Público**: Se um usuário não tiver preferências configuradas, o perfil é considerado público por padrão (mas e-mail/telefone não são exibidos).

3. **Sistema de Amigos**: A lógica de "amigos" está preparada na função RPC, mas ainda não há tabela de amigos implementada. Por enquanto, perfis com `profile_visibility = 'friends'` só são visíveis para o próprio usuário.

4. **Performance**: A função RPC faz múltiplas queries. Para melhorar performance em listas, considere criar uma view materializada ou cachear resultados.

---

## 🎯 Status

- ✅ Função RPC implementada
- ✅ RLS policies atualizadas
- ✅ Hook `usePublicProfile` criado
- ✅ Página de perfil público criada
- ✅ Rota `/perfil/:userId` adicionada
- ⚠️ Lugares onde perfis são exibidos ainda precisam ser atualizados (comentários, cards, etc.)
- ⚠️ Sistema de amigos ainda não implementado
