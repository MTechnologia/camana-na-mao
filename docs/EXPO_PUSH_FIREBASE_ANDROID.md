# Push Android (Expo): configurar Firebase (FCM)

Para o **Expo Push** funcionar no app Android (development build ou APK), o app precisa do **Firebase** inicializado com `google-services.json`. O erro *"Default FirebaseApp is not initialized"* some depois dessa configuração.

## 1. Firebase Console

1. Acesse [Firebase Console](https://console.firebase.google.com).
2. Crie um projeto (ou use um existente).
3. **Adicione um app Android:**
   - Clique em "Adicionar app" → ícone Android.
   - **Nome do pacote:** `br.com.mtechnologia.camaranamao` (igual ao do `app.json`).
   - Registre o app e **baixe o arquivo `google-services.json`**.

## 2. Colocar o arquivo no projeto

- Coloque o `google-services.json` na pasta **`mobile/`** (raiz do app Expo).
- O `app.config.js` usa `./google-services.json` localmente (e a variável de ambiente no EAS; veja abaixo).

### 2.1. EAS Build (build na nuvem)

O arquivo **não** é commitado no git, então o EAS Build não o envia. É preciso configurar uma **variável de ambiente do tipo arquivo** no EAS:

1. Acesse [expo.dev](https://expo.dev) → seu projeto → **Environment variables** (ou Project settings → Environment variables).
2. Clique em **Add variable**.
3. **Name:** `GOOGLE_SERVICES_JSON`
4. **Type:** Secret (e marque como **File** / upload de arquivo).
5. Faça upload do seu `google-services.json` (o mesmo baixado do Firebase).
6. Atribua aos ambientes **preview** e **production** (conforme os perfis que você usa no `eas build`).
7. Salve.

Na hora do build, o EAS coloca o conteúdo do arquivo no runner e define `GOOGLE_SERVICES_JSON` com o caminho; o `app.config.js` já usa esse valor para `googleServicesFile`.

Referência: [EAS – File environment variables](https://docs.expo.dev/eas/environment-variables/#file-environment-variables).

## 3. Regenerar o build Android (se já tiver a pasta `android/`)

Depois de adicionar o arquivo, regenere o projeto nativo e rode de novo:

```bash
cd mobile
npx expo prebuild --clean -p android
npx expo run:android
```

Assim o plugin do Google Services e o `google-services.json` entram no build e o Firebase inicializa no app.

## 4. Envio de notificações (servidor) — obrigatório para push chegar no celular

Se aparecer no log da send-web-push:

`"Unable to retrieve the FCM server key for the recipient's app"` ou `InvalidCredentials`,

o **Expo** não tem a chave FCM do seu projeto. É preciso configurar a **FCM V1 (service account)** no EAS.

### 4.1. Gerar a chave no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com) → seu projeto.
2. **Configurações do projeto** (ícone de engrenagem) → aba **Contas de serviço**.
3. Clique em **Gerar nova chave privada** e baixe o JSON. Guarde em local seguro e **não** commite no git.

### 4.2. Enviar a chave para o EAS

**Opção A – EAS CLI (recomendado)**

No diretório do app (ex.: `mobile/`):

```bash
eas credentials
```

- Escolha **Android** → **production** (ou o profile que você usa).
- **Google Service Account** → **Manage your Google Service Account Key for Push Notifications (FCM V1)**.
- **Upload a new service account key** e informe o caminho do JSON baixado.

**Opção B – Dashboard Expo**

1. Acesse [expo.dev](https://expo.dev) → seu projeto.
2. **Credentials** → **Android** → **FCM V1 service account key**.
3. Envie o arquivo JSON da conta de serviço.

Guia oficial: [Obtain Google Service Account Keys using FCM V1](https://docs.expo.dev/push-notifications/fcm-credentials/).

---

**Resumo:** Baixe `google-services.json` do Firebase (app Android com pacote `br.com.mtechnologia.camaranamao`), coloque em `mobile/google-services.json`, rode `npx expo prebuild --clean -p android` e depois `npx expo run:android`.
