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
- O `app.json` já está configurado com `"googleServicesFile": "./google-services.json"`.

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
