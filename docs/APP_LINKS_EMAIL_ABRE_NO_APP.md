# Links do e-mail abrindo no app (Universal Links / App Links)

Quando o usuário clica em um link do e-mail (ex.: "Abrir no app" da notificação de audiência) no celular, o sistema pode abrir o **app Câmara na Mão** em vez do navegador, desde que o domínio do link e o app estejam configurados corretamente.

## O que já está no projeto

- **App (Expo):** `scheme` `camaranaomao`, iOS `associatedDomains` e Android `intentFilters` para `https://app-mtechnologia.com` em `mobile/app.json`.
- **App (FrontendWebView):** ao abrir via link, o app carrega essa URL no WebView (`expo-linking` + `Linking.getInitialURL` / `addEventListener('url')`).
- **Site:** arquivos em `public/.well-known/` para associação domínio ↔ app:
  - `apple-app-site-association` (iOS Universal Links)
  - `assetlinks.json` (Android App Links)

## O que você precisa fazer

### 1. iOS – Apple Developer

1. Obtenha seu **Apple Team ID** em [Apple Developer → Membership](https://developer.apple.com/account#MembershipDetailsCard).
2. Abra `public/.well-known/apple-app-site-association` e substitua **`YOUR_APPLE_TEAM_ID`** pelo Team ID (ex.: `QQ57RJ5UTD`), mantendo o restante:
   - `"appID": "SEU_TEAM_ID.br.com.mtechnologia.camaranamao"`
   - O mesmo valor em `webcredentials.apps`.

O **bundle identifier** do app já está como `br.com.mtechnologia.camaranamao` em `mobile/app.json` (iOS). Confirme que no EAS/Apple está igual.

### 2. Android – impressão digital do certificado

1. Gere um build (ex.: `eas build -p android`) ou use o certificado que você já usa para publicar.
2. Obtenha o **SHA-256** do certificado de assinatura:
   - **EAS:** `eas credentials -p android` → escolha o profile → anote o **SHA256 Fingerprint**.
   - **Play Console:** Release → Setup → App signing → "App signing key certificate" → "SHA-256 certificate fingerprint".
3. Abra `public/.well-known/assetlinks.json` e substitua **`YOUR_ANDROID_SHA256_FINGERPRINT`** pelo SHA-256 no formato com dois pontos (ex.: `14:6D:E9:83:51:7F:66:01:84:93:4F:2F:5E:E0:8F:3A:D6:F4:CA:41:1A:CF:45:BF:8D:10:76:76:CD`).

O **package** já está como `br.com.mtechnologia.camaranamao` no projeto.

### 3. Deploy do site (domínio app-mtechnologia.com)

- Os arquivos em `public/.well-known/` são copiados para a raiz do build (ex.: `dist/.well-known/`).
- Garanta que o site em **https://app-mtechnologia.com** está em produção a partir desse build (ex.: Render, Vercel, Cloud Run).
- **iOS:** o arquivo `apple-app-site-association` deve ser servido em:
  - `https://app-mtechnologia.com/.well-known/apple-app-site-association`
  - Sem extensão `.json` e, de preferência, com `Content-Type: application/json`.
- **Android:** o arquivo deve estar em:
  - `https://app-mtechnologia.com/.well-known/assetlinks.json`
  - Com `Content-Type: application/json`.

Se o seu host não servir `.well-known` na raiz, configure redirecionamento ou regras para que essas URLs apontem para os arquivos corretos.

### 4. APP_URL no Supabase

Nos secrets da Edge Function (ex.: `send-web-push`), **APP_URL** deve ser exatamente o domínio onde o site está e onde estão os `.well-known`:

- `https://app-mtechnologia.com`

Assim, os links “Abrir no app” nos e-mails serão `https://app-mtechnologia.com/audiencias/...` e poderão ser abertos pelo app.

### 5. Rebuild do app

Depois de alterar `app.json` (scheme, associatedDomains, intentFilters):

- **iOS:** faça um novo build (ex.: `eas build -p ios`) e instale no dispositivo (ou TestFlight). O sistema baixa o AASA na instalação/atualização.
- **Android:** faça um novo build (ex.: `eas build -p android`). A verificação de App Links pode levar alguns segundos após instalar o app.

### 6. Como testar

1. **iOS:** envie um e-mail para você com um link `https://app-mtechnologia.com/audiencias/ALGUM_ID` e, no iPhone, toque no link com o app instalado. Deve abrir o app e carregar essa URL no WebView.
2. **Android:** mesmo link no e-mail (ex.: Outlook). Com o app instalado e `assetlinks.json` correto, o link deve abrir o app em vez do navegador.
3. Se abrir no navegador: confira se os `.well-known` estão acessíveis e com os valores corretos (Team ID e SHA-256). Em iOS, reinstalar o app pode forçar novo download do AASA.

## Resumo

| Onde | O quê |
|------|--------|
| `public/.well-known/apple-app-site-association` | Trocar `YOUR_APPLE_TEAM_ID` pelo Team ID da Apple |
| `public/.well-known/assetlinks.json` | Trocar `YOUR_ANDROID_SHA256_FINGERPRINT` pelo SHA-256 do certificado Android |
| Deploy do site | Servir o site (e `.well-known`) em **https://app-mtechnologia.com** |
| Supabase APP_URL | `https://app-mtechnologia.com` |
| App | Rebuild do app (iOS e Android) após configurar os arquivos e o deploy |

Depois disso, links do tipo `https://app-mtechnologia.com/...` em e-mails (ex.: Outlook no celular) devem abrir no app quando ele estiver instalado.

**Nota sobre Outlook/Gmail:** Em alguns clientes de e-mail, o link pode abrir primeiro no navegador interno. Peça ao usuário que use "Abrir no navegador" / "Open in browser" para que o sistema operacional receba o link e possa abrir o app. Em outros clientes, o toque direto no link já envia ao SO e o app abre.
