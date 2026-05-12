# Relatório técnico — Respeitar preferência de canal (OS-06 / #7643008)

## Objetivo

Implementar **RN-NOT-004**: enviar notificações **somente** pelos canais habilitados em `notification_settings` (`push_enabled`, `email_enabled`, `sms_enabled`). Se o cidadão tiver **linha de preferências** com **todos** os canais desligados, registrar entrega **apenas no app** (`delivered_in_app_only`, `push_delivered_at` para sair da fila agendada).

## Laudo de implementação

### 1. Migration (`supabase/migrations/20260411120000_notifications_delivered_in_app_only.sql`)

- Coluna **`delivered_in_app_only`** `BOOLEAN NOT NULL DEFAULT false` em `notifications`.

### 2. Módulo compartilhado (`supabase/functions/_shared/notification-channels.ts`)

- **`resolveChannelFlags(settings)`** define:
  - **`pushEnabled`:** `push_enabled !== false` (default “ligado” quando a coluna é `NULL` na linha existente).
  - **`emailEnabled`:** `email_enabled === true` (opt-in).
  - **`smsEnabled`:** `sms_enabled === true` (opt-in).
  - **`anyExternalChannelEnabled`:** união dos três.
  - **`hasSettingsRow`:** `false` se `maybeSingle()` não encontrou linha (comportamento legado: ainda tenta push como hoje).
- Quando **`hasSettingsRow && !anyExternalChannelEnabled`**: o usuário desligou explicitamente push, e-mail e SMS → fluxo “só in-app”.

### 3. Edge Function `send-web-push`

- Após silêncio e limite diário, usa **`resolveChannelFlags`**.
- Se **só in-app**: `UPDATE` com `push_delivered_at = now()`, `delivered_in_app_only = true`, resposta JSON **`delivered_in_app_only: true`** e contagens zero nos canais (sem chamar Resend/Twilio/VAPID).
- Caso contrário, mantém o dispatch existente (push web + Expo, e-mail, SMS) **apenas** onde o flag correspondente está habilitado.
- Ao concluir envio por canais: `push_delivered_at` + **`delivered_in_app_only: false`**; corpo da resposta inclui **`delivered_in_app_only: false`**.

### 4. `process-scheduled-notifications`

- **RN-NOT-004** documentado no cabeçalho: a lógica de canais está em **`send-web-push`**; o job só invoca a mesma função que o webhook.
- Interpreta a resposta HTTP: incrementa **`delivered_in_app_only`** no JSON agregado quando `body.delivered_in_app_only === true` (métrica para observabilidade).

### 5. Testes (Deno)

Arquivo: `supabase/functions/_shared/notification-channels_test.ts`.

| Cenário | Cobertura |
|---------|-----------|
| Apenas push | `push` true, demais false → canal externo habilitado |
| Apenas e-mail | `push` false, `email` true |
| Push + e-mail | ambos true |
| Nenhum canal | todos false → `anyExternalChannelEnabled` false |
| Sem linha `notification_settings` | `null` → compatibilidade, ainda há canal externo (push default) |

```bash
deno test supabase/functions/_shared/notification-channels_test.ts
npm run test:notification-channels
```

## Evidências manuais sugeridas

1. Usuário com `notification_settings`: push/e-mail/SMS **false** → INSERT em `notifications` → linha com `delivered_in_app_only = true` e `push_delivered_at` preenchido; sem chamadas externas nos logs.
2. Habilitar só e-mail → apenas fluxo de e-mail dispara (SendGrid/Resend).
3. Job `process-scheduled-notifications` → resposta com `delivered_in_app_only` > 0 quando aplicável.

## Deploy

```bash
supabase db push
supabase functions deploy send-web-push
supabase functions deploy process-scheduled-notifications
```
