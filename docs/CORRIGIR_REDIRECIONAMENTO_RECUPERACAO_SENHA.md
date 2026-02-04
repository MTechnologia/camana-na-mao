# Correção: Redirecionamento de Recuperação de Senha

## 🔴 Problema

Quando o usuário clica no link de recuperação de senha enviado por email, está sendo redirecionado para:
```
http://localhost:3000/#access_token=...&type=recovery
```

Ao invés de redirecionar para a página correta do app: `/nova-senha`

---

## ✅ Solução Implementada

### 1. Correção no Código

**Arquivo:** `src/App.tsx`

Adicionado lógica para interceptar tokens de autenticação na hash da URL e redirecionar corretamente:

```typescript
// Handle Supabase auth redirects with hash tokens
useEffect(() => {
  if (location.hash) {
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    // If it's a recovery token and we're not already on the password update page
    if (accessToken && type === 'recovery' && location.pathname !== '/nova-senha') {
      // Redirect to password update page with the hash
      window.location.replace(`/nova-senha${location.hash}`);
      return;
    }
  }
}, [location]);
```

**Arquivo:** `src/contexts/AuthContext.tsx`

O `redirectTo` já estava correto, mas foi melhorado para garantir que use a origem correta:

```typescript
const resetPassword = useCallback(async (email: string) => {
  const origin = window.location.origin;
  const redirectUrl = `${origin}/nova-senha`;
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  // ...
}, []);
```

---

## ⚙️ Configuração no Supabase Dashboard

**IMPORTANTE:** Você também precisa configurar a URL de redirecionamento no Supabase Dashboard:

### Passos:

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Authentication** → **URL Configuration**
4. Em **Redirect URLs**, adicione:
   - **Desenvolvimento:** `http://localhost:5173/nova-senha`
   - **Produção:** `https://seu-dominio.com/nova-senha`
   - **Staging (se houver):** `https://staging.seu-dominio.com/nova-senha`

5. Em **Site URL**, configure:
   - **Desenvolvimento:** `http://localhost:5173`
   - **Produção:** `https://seu-dominio.com`

6. Clique em **Save**

### URLs que devem estar configuradas:

```
Redirect URLs:
- http://localhost:5173/nova-senha
- http://localhost:5173/
- https://camana-na-mao-767943602990.southamerica-east1.run.app/nova-senha
- https://camana-na-mao-767943602990.southamerica-east1.run.app/

Site URL:
- http://localhost:5173 (dev)
- https://camana-na-mao-767943602990.southamerica-east1.run.app (prod)
```

---

## 🧪 Como Testar

### 1. Teste Local

1. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Acesse: `http://localhost:5173/reset-password`

3. Digite um email válido e clique em "Enviar Link de Recuperação"

4. Verifique o email recebido

5. Clique no link do email

6. ✅ Deve redirecionar para: `http://localhost:5173/nova-senha#access_token=...`

7. A página deve carregar e processar o token automaticamente

### 2. Teste em Produção

1. Acesse a URL de produção: `/reset-password`

2. Siga os mesmos passos acima

3. ✅ Deve redirecionar para a URL de produção: `/nova-senha`

---

## 🔍 Troubleshooting

### Problema: Ainda redireciona para `localhost:3000`

**Causa:** URL não configurada no Supabase Dashboard

**Solução:**
1. Verifique as URLs no Supabase Dashboard (passos acima)
2. Certifique-se de que a URL de produção está correta
3. Aguarde alguns minutos para a configuração propagar

### Problema: Token não é processado na página `/nova-senha`

**Causa:** O token pode estar expirado ou inválido

**Solução:**
1. Verifique o console do navegador (F12)
2. Verifique se há erros de autenticação
3. Solicite um novo link de recuperação

### Problema: Página fica em loading infinito

**Causa:** O token pode estar malformado ou a sessão não está sendo estabelecida

**Solução:**
1. Verifique o console do navegador
2. Verifique os logs do Supabase
3. Tente limpar o cache do navegador e solicitar novo link

---

## 📋 Checklist

- [ ] Código atualizado (`App.tsx` e `AuthContext.tsx`)
- [ ] URLs configuradas no Supabase Dashboard
- [ ] Testado localmente
- [ ] Testado em produção
- [ ] Link do email redireciona corretamente
- [ ] Token é processado na página `/nova-senha`
- [ ] Senha pode ser alterada com sucesso

---

## 🎯 Resultado Esperado

Após a correção:

1. ✅ Usuário solicita recuperação de senha
2. ✅ Recebe email com link
3. ✅ Clica no link
4. ✅ É redirecionado para `/nova-senha` (não `localhost:3000`)
5. ✅ Token é processado automaticamente
6. ✅ Pode alterar a senha
7. ✅ É redirecionado para login após alterar senha

---

## 📞 Notas Adicionais

- O Supabase pode levar alguns minutos para propagar mudanças nas URLs
- Sempre teste em ambiente de desenvolvimento antes de produção
- Mantenha as URLs sincronizadas entre código e dashboard
