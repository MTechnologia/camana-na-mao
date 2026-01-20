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

