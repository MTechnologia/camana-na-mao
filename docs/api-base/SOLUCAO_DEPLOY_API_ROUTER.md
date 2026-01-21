# Solução: Deploy do API Router

**Problema:** Erro ao fazer deploy: `Invalid Function name: api/v1/vereadores`

---

## 🔴 Problema

O Supabase CLI detecta qualquer diretório com `index.ts` dentro de `supabase/functions/` como uma função potencial. O diretório `api/v1/vereadores/` contém um `index.ts` com `serve()`, fazendo o CLI tentar fazer deploy dele como função separada.

**Erro:**
```
Invalid Function name: api/v1/vereadores. 
Must start with at least one letter, and only include alphanumeric characters, 
underscores, and hyphens.
```

---

## ✅ Solução Implementada

### 1. Remover `serve()` do Handler

O arquivo `supabase/functions/api/v1/vereadores/index.ts` tinha um `serve()` no final, fazendo o Supabase CLI pensar que era uma função separada.

**Ação:** Removido o `serve()` e mantidas apenas as exportações `getVereadores` e `getVereadorById`.

### 2. Remover Configuração Inválida

Removida a configuração inválida do `config.toml`:
```toml
[functions."api/v1/vereadores"]  # ❌ Removido
```

### 3. Deploy Específico

Fazer deploy apenas da função `api-router`:

```bash
npx supabase functions deploy api-router
```

**Não use:**
```bash
npx supabase functions deploy  # ❌ Tenta fazer deploy de tudo
```

---

## 📋 Estrutura Correta

```
supabase/functions/
├── api-router/          ✅ Edge Function (tem serve())
│   ├── index.ts         ✅ Entry point
│   └── README.md
├── api/                 ⚠️ Módulos (NÃO são funções)
│   └── v1/
│       └── vereadores/
│           └── index.ts ✅ Apenas exportações (sem serve())
└── shared/              ⚠️ Utilitários compartilhados
    └── ...
```

---

## 🚀 Como Fazer Deploy

### Deploy do API Router

```bash
# Deploy apenas do api-router
npx supabase functions deploy api-router

# Ou se estiver usando Supabase CLI local
supabase functions deploy api-router
```

### Verificar Funções Deployadas

```bash
npx supabase functions list
```

Você deve ver apenas `api-router` na lista, não `api/v1/vereadores`.

---

## ⚠️ Importante

1. **Não use `serve()` em handlers** - Apenas exporte as funções
2. **Deploy específico** - Sempre especifique a função: `deploy api-router`
3. **Estrutura de módulos** - `api/v1/` são apenas módulos TypeScript, não funções

---

## 🔍 Verificar se Está Correto

### 1. Verificar que não há `serve()` no handler

```bash
grep -r "serve(" supabase/functions/api/v1/
```

**Resultado esperado:** Nenhum resultado (ou apenas comentários)

### 2. Verificar que `api-router` tem `serve()`

```bash
grep "serve(" supabase/functions/api-router/index.ts
```

**Resultado esperado:** Deve encontrar `serve(async (req) => {`

### 3. Testar Deploy

```bash
npx supabase functions deploy api-router --debug
```

**Resultado esperado:** Deploy bem-sucedido sem erros sobre `api/v1/vereadores`

---

## 📝 Notas

- O diretório `api/v1/vereadores/` contém apenas **módulos TypeScript** exportados
- Esses módulos são **importados** pelo `api-router`, não são funções separadas
- O `api-router` é a **única função** que precisa ser deployada
- Todos os handlers são registrados dentro do `api-router`

---

**Última atualização:** Janeiro 2026
