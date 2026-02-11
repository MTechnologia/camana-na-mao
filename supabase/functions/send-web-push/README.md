# Send Web Push (+ E-mail e SMS)

Envia notificações por **Push** (navegador), **E-mail** (Resend) e **SMS** (Twilio) quando uma linha é inserida em `notifications`. Respeita `notification_settings.push_enabled`, `email_enabled` e `sms_enabled`; e-mail usa o e-mail do usuário (auth); SMS usa o telefone em `profiles.phone` (E.164, ex. Brasil +55).

## Pré-requisitos

1. **Tabela** `push_subscriptions` (migration `20260204180000_push_subscriptions.sql`).
2. **Chaves VAPID** (uma vez por projeto).

### Gerar chaves VAPID

**Opção A – Node.js (sem instalar Deno):**

```bash
node scripts/generate-vapid-keys.mjs
```

- A **primeira saída** (JSON) → usar no backend como `VAPID_KEYS`.
- A linha **Chave pública para VITE_VAPID_PUBLIC_KEY** (no stderr) → usar no frontend como `VITE_VAPID_PUBLIC_KEY`.

Requer Node.js 15+ (webcrypto).

**Opção B – Deno (se já tiver instalado):**

```bash
deno run https://raw.githubusercontent.com/negrel/webpush/master/cmd/generate-vapid-keys.ts
```

O script com Deno imprime o JSON JWK e depois a linha `your application server key is: ...` (chave pública para o frontend).

### Configurar secrets (Supabase)

**1. Criar `vapid.json`** (não commitar este arquivo):

- Rode o script e **copie só o JSON** (a primeira saída) e salve em `vapid.json` na raiz do projeto; **ou**
- No **PowerShell** (Windows), gerar e salvar em um passo:
  ```powershell
  node scripts/generate-vapid-keys.mjs 2> vapid_public.txt | Set-Content -Path vapid.json -Encoding utf8
  ```
  O JSON fica em `vapid.json`; a chave pública para o frontend fica em `vapid_public.txt` (linha "Chave pública para...").

**2. Definir o secret no Supabase**

- **Recomendado:** Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets** → **Add new secret** → nome `VAPID_KEYS`, valor = conteúdo do `vapid.json` (copiar e colar). Assim evita problemas de aspas no terminal.

- **Via CLI (Bash/Linux/macOS):**
  ```bash
  supabase secrets set VAPID_KEYS="$(cat vapid.json)"
  ```

- **Via CLI (PowerShell):** o JSON tem aspas e quebras de linha; use o Dashboard ou, se quiser pela CLI, use um único valor em uma linha (minificado):
  ```powershell
  $json = (Get-Content vapid.json -Raw) -replace '\s',''; supabase secrets set "VAPID_KEYS=$json"
  ```

Opcional: `PUSH_ADMIN_EMAIL` (ex.: `mailto:suporte@exemplo.org`).

**E-mail (SendGrid ou Resend)** – para enviar notificações por e-mail quando `email_enabled` estiver ativo:

- **SendGrid (recomendado):** veja [docs/SENDGRID_CONFIGURACAO.md](../../docs/SENDGRID_CONFIGURACAO.md). No Supabase (Edge Functions → Secrets), adicione:
  - **SENDGRID_API_KEY**: API Key do SendGrid (apenas Mail Send).
  - **SENDGRID_FROM**: remetente, ex. `noreply@app-mtechnologia.com` ou `Câmara na Mão <noreply@app-mtechnologia.com>`.
- **Resend (alternativa):** crie uma conta em [Resend](https://resend.com), verifique um domínio e gere uma API Key. Adicione **RESEND_API_KEY** e **RESEND_FROM** (formato `"Nome <email@dominio.com>"`). A função usa Resend só se SendGrid não estiver configurado.
- Opcional: **APP_URL** – URL base do app para o link “Abrir no app” no e-mail.

**SMS (Twilio)** – para enviar notificações por SMS quando `sms_enabled` estiver ativo:

- Crie uma conta em [Twilio](https://www.twilio.com), compre um número (ou use trial com números verificados).
- No Supabase (Edge Functions → Secrets), adicione:
  - **TWILIO_ACCOUNT_SID**: Account SID do Twilio.
  - **TWILIO_AUTH_TOKEN**: Auth Token do Twilio.
  - **TWILIO_FROM_NUMBER**: número Twilio no formato E.164 (ex.: `+5511999999999`).
- O telefone do usuário vem de `profiles.phone`; a função normaliza para E.164 (Brasil: +55 + DDD + número).

### Configurar frontend (.env)

No `.env` do projeto web (Vite), use a **chave pública** (application server key) que o script imprimiu:

```env
VITE_VAPID_PUBLIC_KEY=BNx...
```

(É a mesma que aparece em `your application server key is: ...` no output do script.)

## Webhook no Supabase

Para cada **INSERT** em `notifications`, o Supabase deve chamar esta função:

1. Dashboard → **Database** → **Webhooks**.
2. **Create a new hook**.
3. **Table**: `notifications`.
4. **Events**: marque **Insert**.
5. **Type**: Supabase Edge Functions.
6. **Function**: `send-web-push`.
7. **HTTP Headers**: adicione **Authorization** com o valor **Bearer** + sua **service_role key** (ou use “Add auth header with service key” se disponível).
8. Salve.

Assim, qualquer insert em `notifications` dispara o envio por **Push** (se habilitado e com assinatura), **E-mail** (se habilitado e usuário tem e-mail) e **SMS** (se habilitado e perfil tem telefone).

## Deploy

```bash
supabase functions deploy send-web-push
```

## Como testar o push

1. **Checar pré-requisitos**
   - Migration `push_subscriptions` aplicada (`supabase db push` ou já no projeto).
   - Função `send-web-push` em deploy e secret **VAPID_KEYS** configurado.
   - Webhook em **notifications** (Insert) apontando para `send-web-push`, com header de autorização (service_role).
   - Frontend com **VITE_VAPID_PUBLIC_KEY** no `.env`.

2. **Ativar push no app**
   - Abra o app (ex.: `npm run dev`) e faça login.
   - Vá em **Perfil** → **Preferências**.
   - Ative o switch **Push** (“Notificações no navegador”).
   - Quando o navegador pedir, clique em **Permitir**.
   - Salve as preferências. A assinatura será gravada em `push_subscriptions`.

3. **Disparar uma notificação**
   - **Opção A – Lembrete audiência:** chame a função `audiencia-reminder-d1` com `?for_date=YYYY-MM-DD` (data de uma audiência que tenha sua inscrição). Ex.: no cron ou no navegador:  
     `https://SEU_PROJECT.supabase.co/functions/v1/audiencia-reminder-d1?for_date=2026-02-26`  
     (com header `Authorization: Bearer SEU_ANON_KEY`). Isso insere em `notifications` e o webhook chama `send-web-push`.
   - **Opção B – Inserção manual (Dashboard):** Supabase → **Table Editor** → tabela **notifications** → **Insert row**. Preencha `user_id` (seu usuário), `title`, `message`, `type` (ex.: `general`), e salve. O webhook dispara e o push é enviado.
   - **Opção C – send-notification:** se tiver como chamar a Edge Function `send-notification` com seu `userId`, ela insere em `notifications` e o webhook envia o push.

4. **Ver o push**
   - Deixe o app em segundo plano (minimize o navegador ou abra outra aba) ou feche a aba do app.
   - O navegador deve exibir a notificação (título e corpo). Ao clicar, deve abrir a URL da notificação (ex.: a página da audiência).

**Dica:** Use o **Table Editor** (opção B) para um teste rápido: insira uma linha em `notifications` e confira se o push aparece no sistema e no navegador.

## Fluxo

1. **Push:** usuário ativa “Push” em Preferências e permite no navegador; a assinatura é gravada em `push_subscriptions`. **E-mail:** usa o e-mail do login (auth). **SMS:** usa o telefone em Perfil (campo em `profiles.phone`).
2. Quando algo insere em `notifications`, o webhook chama `send-web-push`.
3. A função consulta `notification_settings` (push_enabled, email_enabled, sms_enabled) e envia por cada canal habilitado para o qual exista contato (assinatura, e-mail ou telefone).
4. Push: navegador exibe a notificação; E-mail: Resend envia; SMS: Twilio envia.

## Respostas

- `{ "success": true, "push": 1, "email": 1, "sms": 0 }` – push e e-mail enviados; SMS não (desabilitado ou sem telefone).
- `{ "success": true, "push": 0, "email": 0, "sms": 0 }` – nenhum canal enviado (preferências ou falta de configuração/secrets).

Assinaturas push que retornam 410/404 são removidas automaticamente.
