# Como Encontrar seu User ID

## 📋 Métodos para encontrar o User ID

### 1. **Via Console do Navegador (Mais Rápido)**

1. Abra o aplicativo e faça login
2. Abra o Console do navegador:
   - **Chrome/Edge:** `F12` ou `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Firefox:** `F12` ou `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
3. Na aba **Console**, digite:

```javascript
// Se estiver usando Supabase client
const { data: { user } } = await supabase.auth.getUser();
console.log('User ID:', user?.id);
console.log('Email:', user?.email);
```

Ou se preferir, você pode usar o hook do React diretamente no console (se tiver acesso ao objeto de contexto):

```javascript
// No console do navegador, se tiver acesso ao contexto
window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.forEach(renderer => {
  const fiber = renderer.findFiberByHostInstance(document.querySelector('[data-testid]'));
  // Isso é mais complexo, melhor usar o método acima
});
```

### 2. **Via Código Temporário no Frontend**

Adicione temporariamente este código em qualquer página (por exemplo, `src/pages/Profile.tsx`):

```typescript
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

// Dentro do componente
const { user } = useAuth();

useEffect(() => {
  if (user) {
    console.log('=== SEU USER ID ===');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('==================');
    // Ou mostrar em um alert
    alert(`Seu User ID: ${user.id}\nEmail: ${user.email}`);
  }
}, [user]);
```

### 3. **Via Supabase Dashboard (Recomendado)**

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Authentication** → **Users**
4. Procure pelo email `felip.nho19@gmail.com`
5. O **UUID** exibido é o seu `user_id`

### 4. **Via SQL Query no Supabase**

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Execute esta query:

```sql
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'felip.nho19@gmail.com';
```

O campo `id` retornado é o seu `user_id`.

### 5. **Via URL do Perfil Público (Depois de implementar)**

Se você já estiver logado e acessar `/perfil`, você pode:

1. Abrir o Console do navegador
2. Verificar a URL ou inspecionar elementos para encontrar seu ID
3. Ou adicionar um botão temporário que mostre o ID:

```typescript
// Em src/pages/Profile.tsx, adicione temporariamente:
<Button onClick={() => {
  if (user) {
    navigator.clipboard.writeText(user.id);
    toast.success(`User ID copiado: ${user.id}`);
  }
}}>
  Copiar meu User ID
</Button>
```

---

## 🎯 Método Mais Rápido (Recomendado)

**Use o Console do Navegador:**

1. Faça login no aplicativo
2. Abra o Console (`F12`)
3. Cole este código:

```javascript
(async () => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(
    'https://vjzkzsczlbtmrzewffdx.supabase.co', // Substitua pela sua URL
    'sua-anon-key' // Substitua pela sua anon key (ou deixe vazio se já estiver autenticado)
  );
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Erro:', error);
  } else if (user) {
    console.log('✅ Seu User ID:', user.id);
    console.log('📧 Email:', user.email);
    
    // Copiar para clipboard
    navigator.clipboard.writeText(user.id).then(() => {
      console.log('✅ User ID copiado para clipboard!');
    });
  } else {
    console.log('❌ Nenhum usuário logado');
  }
})();
```

**Ou mais simples ainda:**

Se você já estiver logado, pode acessar o objeto `user` diretamente via localStorage:

```javascript
// No console do navegador
const session = JSON.parse(localStorage.getItem('sb-vjzkzsczlbtmrzewffdx-auth-token') || '{}');
console.log('User ID:', session?.user?.id);
console.log('Email:', session?.user?.email);
```

---

## 📝 Exemplo de User ID

Um User ID do Supabase tem este formato:
```
57a96bf3-f0a2-454f-b6c6-99358b1ef8dc
```

É um UUID (Universally Unique Identifier) de 36 caracteres.

---

## 🔗 Como usar o User ID

Depois de encontrar seu User ID, você pode:

1. **Acessar seu perfil público:**
   ```
   /perfil/57a96bf3-f0a2-454f-b6c6-99358b1ef8dc
   ```

2. **Usar em queries SQL:**
   ```sql
   SELECT * FROM profiles WHERE id = '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc';
   ```

3. **Usar em código:**
   ```typescript
   const userId = '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc';
   const { profile } = usePublicProfile(userId);
   ```

---

## ⚠️ Nota de Segurança

- O User ID não é uma informação sensível por si só
- Porém, não compartilhe seu User ID publicamente se você tiver dados sensíveis
- O User ID é necessário para acessar perfis públicos, mas isso é intencional

---

## 🆘 Se nenhum método funcionar

Se você não conseguir encontrar o User ID pelos métodos acima:

1. Verifique se está logado corretamente
2. Verifique se o email está correto
3. Use o Supabase Dashboard (método mais confiável)
4. Entre em contato com o administrador do sistema
