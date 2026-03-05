# Revisão: Notificação de boas-vindas (push + e-mail)

Este guia ajuda a conferir por que a notificação de boas-vindas (após o cadastro) pode não estar chegando no celular (push) ou no e-mail.

---

## 1. Fluxo em resumo

1. Usuário finaliza o cadastro → o app insere uma linha em `notifications` (título e mensagem de boas-vindas).
2. O **Database Webhook** do Supabase (tabela `notifications`, evento **Insert**) chama a Edge Function **`send-web-push`**.
3. A `send-web-push` lê `notification_settings` do usuário e envia:
   - **Push (navegador):** se houver assinatura em `push_subscriptions`.
   - **Push (celular/Expo):** se `profiles.expo_push_token` estiver preenchido.
   - **E-mail:** se `email_enabled === true` e existir **RESEND_API_KEY** (ou SendGrid) nos secrets.
   - **SMS:** se `sms_enabled === true` e Twilio configurado.

Se o webhook não existir ou os secrets não estiverem configurados, nada é enviado.

---

## 2. Checklist: Webhook no Supabase

O webhook é o que dispara o envio ao inserir em `notifications`.

1. Acesse o **Supabase Dashboard** do projeto.
2. Vá em **Database** → **Webhooks**.
3. Verifique se existe um webhook com:
   - **Table:** `notifications`
   - **Events:** **Insert** (marcado)
   - **Type:** Supabase Edge Functions
   - **Function:** `send-web-push`
   - **HTTP Headers:** `Authorization: Bearer <SUA_SERVICE_ROLE_KEY>`

Se não existir, crie:

- **Create a new hook** → Table: `notifications` → Events: **Insert** → Type: **Supabase Edge Functions** → Function: **send-web-push**.
- Adicione o header **Authorization** com valor `Bearer` + sua **service_role key** (em **Project Settings** → **API**).

Sem esse webhook, a função `send-web-push` **nunca** é chamada quando uma notificação é inserida (incluindo a de boas-vindas).

---

## 3. Checklist: Secrets da Edge Function (e-mail e push)

Em **Project Settings** → **Edge Functions** → **Secrets**, confira:

### E-mail (Resend – alternativa ao SendGrid)

Para o e-mail de boas-vindas ser enviado:

| Secret            | Descrição                                      |
|------------------|-------------------------------------------------|
| `RESEND_API_KEY` | API Key da conta [Resend](https://resend.com).  |
| `RESEND_FROM`    | Remetente, ex.: `"Câmara na Mão <noreply@seudominio.com>"`. |

- Domínio do remetente deve estar verificado no Resend.
- Se usar **SendGrid** em vez de Resend: `SENDGRID_API_KEY` e `SENDGRID_FROM` (a função usa SendGrid primeiro, Resend como fallback).

### Push (navegador)

| Secret       | Descrição |
|-------------|-----------|
| `VAPID_KEYS` | JSON das chaves VAPID (gerado por `node scripts/generate-vapid-keys.mjs`). |

No frontend (`.env`): `VITE_VAPID_PUBLIC_KEY` com a chave pública impressa pelo script.

### Opcional

- `APP_URL`: URL base do app (para o link “Abrir no app” no e-mail).
- `PUSH_ADMIN_EMAIL`: ex.: `mailto:suporte@exemplo.org`.

---

## 4. Push no celular (bandeja)

Para a notificação aparecer **no celular** (app nativo):

1. O usuário precisa **abrir o app pelo menos uma vez** depois de logar.
2. O app envia o **Expo Push Token** para o backend (campo `profiles.expo_push_token`).
3. Quando a `send-web-push` roda, ela usa esse token e chama a API da Expo; o dispositivo recebe o push.

Se o cadastro for feito **só na web**, o celular não terá token ainda; a primeira notificação pode não chegar no aparelho até que o usuário abra o app mobile logado. O e-mail de boas-vindas pode chegar normalmente se Resend (ou SendGrid) estiver configurado.

---

## 5. Como testar

### Teste rápido (sem novo cadastro)

1. **Table Editor** → tabela **notifications** → **Insert row**.
2. Preencha:
   - `user_id`: UUID de um usuário de teste (ex.: seu usuário).
   - `title`: `Teste boas-vindas`
   - `message`: `Mensagem de teste`
   - `type`: `system`
3. Salve.
4. Confira:
   - **Logs da Edge Function** `send-web-push` no Supabase (resposta com `email: 1` ou `expo: 1`, etc.).
   - E-mail na caixa de entrada (e push no celular, se o usuário tiver token).

### Teste com novo cadastro

1. Garanta que o webhook está criado e os secrets (Resend ou SendGrid e, se quiser push web, VAPID) estão configurados.
2. Cadastre um novo usuário (e-mail válido) e complete todos os passos até o fim.
3. O app insere a notificação de boas-vindas e faz upsert em `notification_settings` com `email_enabled: true` e `push_enabled: true`.
4. Verifique o e-mail e, se tiver aberto o app no celular com esse usuário, o push na bandeja.

---

## 6. Diagnóstico passo a passo (não recebo e-mail/push)

Siga na ordem para achar onde está falhando.

### Passo A: A notificação está sendo criada?

1. Complete um cadastro (ou use um usuário já existente).
2. No **Supabase Dashboard** → **Table Editor** → tabela **notifications**.
3. Filtre por `user_id` = ID do usuário que se cadastrou (ou veja as linhas mais recentes).
4. **Existe uma linha** com título “Bem-vindo(a) à Câmara Municipal!”?
   - **Não** → O insert está falhando (ex.: RLS). Aplique a migration `20260213150000_notifications_insert_own.sql` (política “Users can insert notification for themselves”). Se ao finalizar o cadastro aparecer o toast “Não foi possível enviar o e-mail de boas-vindas”, o insert falhou.
   - **Sim** → O insert está ok. Siga para o Passo B.

### Passo B: O webhook chama a função?

1. **Edge Functions** → **send-web-push** → **Logs**.
2. Insira **uma linha manual** em `notifications` (Table Editor): `user_id` = seu usuário, `title` = "Teste", `message` = "Teste", `type` = "system".
3. Nos logs da `send-web-push`, aparece **uma nova execução** nos próximos segundos?
   - **Não** → O webhook não está configurado ou não está disparando. Crie o webhook (secção 2): tabela `notifications`, evento **Insert**, função `send-web-push`, header **Authorization: Bearer** + **service_role key**.
   - **Sim** → Anote o corpo da resposta (ex.: `{ "email": 0, "expo": 0 }`). Siga para o Passo C.

### Passo C: E-mail está configurado?

1. Nos **Logs** da `send-web-push`, a resposta tem **`email: 1`**?
   - **Não** (ex.: `email: 0`) → A função não está enviando e-mail. Em **Project Settings** → **Edge Functions** → **Secrets**, confira:
     - **RESEND_API_KEY** e **RESEND_FROM** (ou **SENDGRID_API_KEY** e **SENDGRID_FROM**).
     - **RESEND_FROM** no formato `"Nome <email@seudominio.com>"` e domínio verificado no Resend.
   - **Sim** → O envio foi aceite pela função. Verifique caixa de spam e “Promoções”; o remetente deve ser o configurado em RESEND_FROM/SENDGRID_FROM.

### Passo D: Push no celular

- Só funciona se o usuário **abriu o app (logado) ao menos uma vez** no celular (para gravar o Expo token).
- Em **Table Editor** → **profiles** → linha do usuário: a coluna **expo_push_token** está preenchida? Se não, o push no celular só passará a funcionar depois que o usuário abrir o app no dispositivo.

---

## 7. Resumo de “não recebi nada”

| Sintoma              | O que verificar |
|----------------------|------------------|
| Nada no e-mail       | Webhook criado? Resend (ou SendGrid) nos secrets? `notification_settings` do usuário com `email_enabled: true`? (O cadastro já faz upsert com `email_enabled: true`.) |
| Nada no celular      | Usuário abriu o app (logado) ao menos uma vez? `profiles.expo_push_token` preenchido para esse usuário? |
| Webhook não dispara  | Database → Webhooks: hook em `notifications`, evento Insert, função `send-web-push`, header Authorization com service_role. |
| Função dá erro      | Edge Functions → `send-web-push` → Logs; conferir secrets (RESEND_*, SENDGRID_*, VAPID_KEYS). |

Documentação detalhada da função: `supabase/functions/send-web-push/README.md`.

---

**Resumo:** Na maioria dos casos o problema é (1) webhook não criado em **Database → Webhooks**, ou (2) secrets de e-mail (**RESEND_API_KEY** + **RESEND_FROM**) não configurados em **Edge Functions → Secrets**. Siga a secção 6 para identificar qual deles.
