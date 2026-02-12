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

## 4. Envio de notificações (servidor)

Para o **Expo Push API** conseguir enviar para dispositivos Android, é preciso configurar a **chave FCM V1** no EAS (para builds na nuvem) ou no seu backend. Passos resumidos:

- No Firebase: **Configurações do projeto** → **Contas de serviço** → **Gerar nova chave privada** (JSON).
- No [expo.dev](https://expo.dev): projeto → **Credentials** → Android → **FCM V1 service account key** → enviar esse JSON.

Guia completo: [Obtain Google Service Account Keys using FCM V1](https://docs.expo.dev/push-notifications/fcm-credentials/).

---

**Resumo:** Baixe `google-services.json` do Firebase (app Android com pacote `br.com.mtechnologia.camaranamao`), coloque em `mobile/google-services.json`, rode `npx expo prebuild --clean -p android` e depois `npx expo run:android`.
