## Variáveis de ambiente

Este projeto possui **web (Vite)** e **mobile (Expo)**. Cada um usa variáveis diferentes.

### Web (Vite)

Este projeto padroniza as variáveis públicas do frontend com o prefixo `CAMARA_`.
O Vite foi configurado para expor variáveis que começam com `CAMARA_` (e também mantém suporte ao legado `VITE_` durante a migração).

- **`CAMARA_URL`**: URL do projeto Supabase (cloud ou local)
- **`CAMARA_PUBLISHABLE_KEY`**: chave pública/anon do Supabase
- **`CAMARA_PROJECT_ID`**: ID do projeto (opcional, quando necessário)

**Onde configurar**
- **Local**: arquivo `.env` (não commitar)
- **Render**: Environment Variables do serviço

> Importante: não commitar chaves reais. Use `env.example` como referência.

### Mobile (Expo)

No Expo, variáveis públicas devem começar com `EXPO_PUBLIC_`.

- **`EXPO_PUBLIC_WEB_URL`**: URL pública do frontend web (ex.: Render) para a WebView abrir direto
  - Ex.: `https://camara-na-mao.onrender.com/`

> Observação: para APK distribuído, use sempre uma URL pública (HTTPS) — não IP local.

### Supabase local (Docker + CLI)

Ao rodar `supabase start`, o CLI expõe URLs/keys locais no output:
- Project URL (Kong): `http://127.0.0.1:54321`
- Keys: `sb_publishable_*` / `sb_secret_*`

Para testar no celular, troque `127.0.0.1` pelo **IP do seu PC** na rede.

---

### Outro desenvolvedor: conectar no mesmo banco (.env compartilhado)

Se você repassou o `.env` para outra pessoa e o app **não conecta no banco** no ambiente dela, siga este checklist.

**1. Nomes exatos das variáveis**

O código usa **um** dos conjuntos abaixo (não misturar nomes de um com valores do outro):

| Conjunto   | URL                          | Chave (anon)                    |
|-----------|------------------------------|----------------------------------|
| Preferido | `CAMARA_URL`                 | `CAMARA_PUBLISHABLE_KEY`        |
| Legado    | `VITE_SUPABASE_URL`          | `VITE_SUPABASE_PUBLISHABLE_KEY` |

- **Erro comum:** no Supabase Dashboard a chave aparece como "anon key" ou "anon public", mas no `.env` o nome deve ser **`CAMARA_PUBLISHABLE_KEY`** ou **`VITE_SUPABASE_PUBLISHABLE_KEY`**. Se no `.env` estiver `VITE_SUPABASE_ANON_KEY`, o Vite **não** expõe essa variável com esse nome e a conexão falha.
- **Exemplo mínimo de `.env` para conectar no mesmo banco:**

```env
CAMARA_URL=https://SEU_PROJECT_REF.supabase.co
CAMARA_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

(Substitua pela URL e pela anon key do projeto no Supabase → **Project Settings** → **API**.)

**2. Reiniciar o servidor após alterar o .env**

O Vite lê o `.env` apenas na subida. Depois de colar ou editar o arquivo:

- Parar o `npm run dev` (Ctrl+C).
- Rodar de novo: `npm run dev`.

**3. Arquivo na raiz do projeto**

O `.env` deve ficar na **raiz do repositório** (mesmo nível que `package.json` e `vite.config.ts`), não dentro de `src/` ou em outra pasta.

**4. CORS no Supabase (se der erro de rede/CORS no navegador)**

Se no console do navegador aparecer erro de CORS ao chamar o Supabase:

- **Supabase Dashboard** → **Project Settings** → **API** (ou **Authentication** → **URL Configuration**).
- Em **Allowed origins** (ou **Redirect URLs**), incluir a origem de onde o outro dev está rodando o app, por exemplo:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
  - Se usar outra porta, ex.: `http://localhost:3000`.

**5. Testes E2E (.env.e2e.local)**

Para os testes Playwright (`npm run test:e2e`), crie `.env.e2e.local` a partir de `.env.e2e.example`:

```
E2E_TEST_EMAIL=usuario@exemplo.com
E2E_TEST_PASSWORD=senha_do_usuario
```

O usuário deve existir no **mesmo projeto Supabase** usado pelo `.env` (CAMARA_URL), e o e-mail deve estar **confirmado**. Senhas com caracteres especiais: use aspas (`E2E_TEST_PASSWORD="senha@123"`).

**6. Conferir se as variáveis chegam no app**

No navegador (DevTools → Console), ao carregar o app:

```js
// Não fazer em produção com dados sensíveis; só para debug local.
console.log('URL:', import.meta.env.CAMARA_URL || import.meta.env.VITE_SUPABASE_URL);
console.log('Key present:', !!(import.meta.env.CAMARA_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY));
```

Se aparecer `undefined`, o `.env` não está sendo lido ou os nomes estão errados (e o servidor precisa ser reiniciado após corrigir).

