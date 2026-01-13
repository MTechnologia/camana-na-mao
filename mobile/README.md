# Câmara na Mão — Mobile (React Native)

Este app fica em `mobile/` e foi criado com **Expo + React Native + TypeScript**.

## Rodar no Android (forma mais rápida)

- **Pré-requisitos**:
  - Node.js + npm
  - Android com o app **Expo Go** instalado (Play Store)
  - Celular e PC na **mesma rede Wi‑Fi**

- **Comandos**:

```bash
cd mobile
npm start
```

Depois, escaneie o QR code no terminal com o Expo Go.

## Testar a API

Na tela inicial do app:
- Informe uma **URL acessível pelo celular** (ex.: `http://192.168.0.10:3000/health`)
- Toque em **Testar API**

> Importante: no celular **não use** `localhost` para acessar serviços do seu PC. Use o IP da sua rede.

## Variáveis de ambiente

O app lê `process.env.EXPO_PUBLIC_*`.

Veja o arquivo `env.example` e, se quiser, crie um arquivo local com os valores (ex.: `EXPO_PUBLIC_PING_URL`).

## Ver o frontend (web) dentro do app

O app tem uma aba **Frontend** que abre o web em uma WebView.

- Suba o front Vite (no repo raiz):

```bash
cd ..
npm run dev
```

- No mobile, configure a URL do front (exemplo do seu PC na rede):
  - `EXPO_PUBLIC_WEB_URL=http://192.168.15.28:5173/`

> Observação: para o APK funcionar no seu celular, o endereço precisa ser acessível pelo celular (IP da rede ou URL pública).

## Gerar um APK para instalar no Android

Para gerar APK/AAB normalmente se usa **EAS Build** (na nuvem). Exemplo (requer conta Expo):

```bash
cd mobile
npx expo login
npx eas-cli@latest build -p android --profile preview
```

Se você preferir, me diga se quer **APK de release** ou **development build** (recomendado pra testar features nativas).

