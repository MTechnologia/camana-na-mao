# Solução para Acesso à API REST - Problema de Caminhos Aninhados

## 🔴 Problema

Ao tentar acessar:
```
https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api/v1/vereadores
```

Você recebe:
```json
{
  "code": "NOT_FOUND",
  "message": "Requested function was not found"
}
```

### Por que isso acontece?

O **Supabase não suporta caminhos aninhados** em Edge Functions. Quando você acessa `/functions/v1/api/v1/vereadores`, o Supabase procura uma função chamada `api/v1/vereadores`, mas nomes de funções não podem conter barras (`/`).

## ✅ Soluções Disponíveis

### Solução 1: Usar o `api-router` com Query Parameter (RECOMENDADO)

Esta é a solução mais simples e já está implementada:

```bash
# Lista de vereadores
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router?path=vereadores"

# Com query parameters
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router?path=vereadores&page=1&limit=10&search=Silva"

# Detalhes de vereador
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router?path=vereadores/joao-silva"
```

**Vantagens:**
- ✅ Já está implementado
- ✅ Funciona imediatamente
- ✅ Suporta todos os recursos da API

**Desvantagens:**
- ⚠️ URL não segue padrão REST tradicional (`/api/v1/vereadores`)

### Solução 2: Criar Função Proxy Separada

Criar uma função chamada `api-v1-vereadores` (sem barras) que funciona como proxy:

```bash
# Deploy da função proxy
npx supabase functions deploy api-v1-vereadores

# Acesso
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-v1-vereadores"
```

**Vantagens:**
- ✅ URL mais limpa
- ✅ Segue padrão REST

**Desvantagens:**
- ⚠️ Requer criar uma função para cada recurso
- ⚠️ Não escala bem

### Solução 3: Usar Proxy Reverso (Produção)

Para produção, você pode configurar um proxy reverso (Nginx, Cloudflare, etc.) que mapeia `/api/v1/*` para o `api-router`:

```nginx
location /api/v1/ {
    proxy_pass https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router?path=;
}
```

**Vantagens:**
- ✅ URL REST padrão
- ✅ Funciona para todos os recursos

**Desvantagens:**
- ⚠️ Requer infraestrutura adicional
- ⚠️ Mais complexo de configurar

## 🚀 Como Usar Agora

### Opção 1: Via Query Parameter (Funciona Agora)

```bash
# Health check
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router"

# Lista de vereadores
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router?path=vereadores"

# Com filtros
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router?path=vereadores&page=1&limit=20&search=Silva&partido=PT"

# Detalhes
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router?path=vereadores/joao-silva"
```

### Opção 2: Criar Função Proxy (Requer Deploy)

1. Criar função proxy em `supabase/functions/api-v1-vereadores/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getVereadores, getVereadorById } from '../api/v1/vereadores/index.ts';

serve(async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  // Extrair ID se houver
  const pathMatch = pathname.match(/\/api-v1-vereadores\/([^\/]+)$/);
  
  if (pathMatch) {
    return await getVereadorById(req, { id: pathMatch[1] });
  } else {
    return await getVereadores(req);
  }
});
```

2. Deploy:
```bash
npx supabase functions deploy api-v1-vereadores
```

3. Acesso:
```bash
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-v1-vereadores"
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-v1-vereadores/joao-silva"
```

## 📝 Atualizar Documentação

Após escolher uma solução, atualize:

1. `docs/ENDPOINTS_API_BACKEND.md` - URLs de acesso
2. `docs/MAPEAMENTO_ROTAS.md` - Rotas da API REST
3. Código do frontend/mobile que consome a API

## 🔍 Verificar Status

```bash
# Verificar se api-router está funcionando
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router"

# Testar acesso via query parameter
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router?path=vereadores&limit=5"
```

## 🐛 Troubleshooting

### Erro: "Requested function was not found"

- ✅ Use o `api-router` com query parameter
- ✅ Verifique se a função foi deployada: `npx supabase functions list`
- ✅ Verifique os logs: Dashboard Supabase > Edge Functions > Logs

### Erro: "Rota não encontrada"

- ✅ Verifique se as rotas estão registradas no `api-router/index.ts`
- ✅ Verifique se os handlers estão exportados corretamente
- ✅ Verifique os logs da função para mais detalhes

### Erro: "Rate limit exceeded"

- ✅ Aguarde alguns segundos e tente novamente
- ✅ Verifique se está usando autenticação (usuários autenticados têm limites maiores)
