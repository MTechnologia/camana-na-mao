# Guia de Teste - Política de Privacidade e Consentimentos

## ✅ O que foi implementado

1. **Página de Política de Privacidade** (`/privacidade`)
2. **Aceite de termos no registro**
3. **Sistema de consentimentos no banco de dados**

---

## 🧪 Como testar

### 1. Testar a Página de Política de Privacidade

#### Opção A: Via Menu
1. Faça login no sistema
2. Abra o menu lateral (ícone de menu no canto superior)
3. Role até o final do menu
4. Clique em **"Política de privacidade"**
5. ✅ Deve abrir a página `/privacidade` com o conteúdo completo

#### Opção B: Via URL direta
1. Acesse diretamente: `http://localhost:5173/privacidade` (ou sua URL de produção)
2. ✅ Deve carregar a página de política de privacidade

#### O que verificar:
- [ ] Página carrega sem erros
- [ ] Conteúdo completo da política está visível
- [ ] Links funcionam
- [ ] Botão "Voltar" funciona
- [ ] Layout responsivo

---

### 2. Testar Aceite de Termos no Registro

1. Acesse a página de registro: `/register`
2. Preencha os dados do **Step 1** (Nome, Email, Telefone)
3. Clique em "Continuar"
4. No **Step 2** (Senha):
   - [ ] Deve aparecer dois checkboxes:
     - "Aceito os termos de uso"
     - "Aceito a política de privacidade"
   - [ ] Os checkboxes têm links clicáveis para `/privacidade`
   - [ ] O botão "Continuar" está **desabilitado** até aceitar ambos
5. Marque ambos os checkboxes
6. ✅ O botão "Continuar" deve ficar **habilitado**
7. Clique em "Continuar"
8. ✅ Deve criar a conta e registrar os consentimentos no banco

#### O que verificar:
- [ ] Checkboxes aparecem corretamente
- [ ] Links abrem em nova aba
- [ ] Botão desabilitado quando não aceita
- [ ] Botão habilitado quando aceita ambos
- [ ] Conta é criada com sucesso
- [ ] Consentimentos são registrados no banco

---

### 3. Verificar Consentimentos no Banco de Dados

#### Via Supabase Dashboard:
1. Acesse o Supabase Dashboard
2. Vá em **Table Editor** → `user_consents`
3. Procure pelo `user_id` do usuário que acabou de se registrar
4. ✅ Deve encontrar 2 registros:
   - `consent_type: 'terms_of_use'`
   - `consent_type: 'privacy_policy'`
   - Ambos com `granted: true`
   - `granted_at` preenchido
   - `revoked_at: null`

#### Via SQL Query:
```sql
SELECT 
  user_id,
  consent_type,
  granted,
  granted_at,
  revoked_at,
  version
FROM user_consents
WHERE user_id = 'SEU_USER_ID_AQUI'
ORDER BY granted_at DESC;
```

#### O que verificar:
- [ ] Registros existem na tabela `user_consents`
- [ ] `consent_type` correto (`terms_of_use` e `privacy_policy`)
- [ ] `granted = true`
- [ ] `granted_at` preenchido
- [ ] `version = '1.0'`
- [ ] `revoked_at = null`

---

### 4. Testar Migração do Banco

Se ainda não rodou a migration:

```bash
# Via Supabase CLI
supabase db push

# Ou via SQL Editor no Dashboard
# Copie e cole o conteúdo de:
# supabase/migrations/20260131000000_user_consents.sql
```

#### O que verificar:
- [ ] Migration roda sem erros
- [ ] Tabela `user_consents` é criada
- [ ] Enum `consent_type` é criado
- [ ] Funções RPC são criadas:
  - `grant_consent()`
  - `revoke_consent()`
  - `has_consent()`
- [ ] RLS policies estão ativas

---

## 🐛 Troubleshooting

### Problema: Link não funciona / Nada acontece ao clicar

**Solução:**
1. Verifique se o import está no `App.tsx`:
   ```typescript
   const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
   ```
2. Verifique se a rota está no `App.tsx`:
   ```typescript
   <Route path="/privacidade" element={<PrivacyPolicyPage />} />
   ```
3. Verifique o console do navegador para erros
4. Recarregue a página (Ctrl+F5)

### Problema: Página não carrega / Erro 404

**Solução:**
1. Verifique se o arquivo existe: `src/pages/PrivacyPolicyPage.tsx`
2. Verifique se o export está correto: `export default function PrivacyPolicyPage()`
3. Verifique se não há erros de sintaxe no arquivo

### Problema: Checkboxes não aparecem no registro

**Solução:**
1. Verifique se o componente `Checkbox` está importado:
   ```typescript
   import { Checkbox } from "@/components/ui/checkbox";
   ```
2. Verifique se os estados estão no `formData`:
   ```typescript
   acceptedTerms: false,
   acceptedPrivacy: false,
   ```

### Problema: Consentimentos não são salvos

**Solução:**
1. Verifique se a migration foi executada
2. Verifique se as funções RPC existem:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN ('grant_consent', 'revoke_consent', 'has_consent');
   ```
3. Verifique o console do navegador para erros
4. Verifique os logs do Supabase

---

## 📋 Checklist Completo

### Frontend
- [ ] Página `/privacidade` carrega
- [ ] Link no menu funciona
- [ ] Checkboxes aparecem no registro
- [ ] Links nos checkboxes funcionam
- [ ] Botão desabilitado quando não aceita
- [ ] Botão habilitado quando aceita
- [ ] Sem erros no console

### Backend
- [ ] Migration executada
- [ ] Tabela `user_consents` existe
- [ ] Funções RPC criadas
- [ ] RLS policies ativas
- [ ] Consentimentos são salvos no registro

### Banco de Dados
- [ ] Registros aparecem na tabela
- [ ] Dados corretos (tipo, granted, timestamps)
- [ ] Version preenchida

---

## 🎯 Próximos Passos (Opcional)

1. **Página de Gestão de Consentimentos** no perfil
2. **Exportação de Dados Pessoais** (portabilidade LGPD)
3. **Sistema de Anonimização Automática**

---

## 📞 Suporte

Se encontrar problemas, verifique:
1. Console do navegador (F12)
2. Logs do Supabase
3. Network tab (para verificar requisições)
