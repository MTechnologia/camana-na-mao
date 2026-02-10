# Send Web Push

Envia **Web Push** ao navegador quando uma notificação é inserida na tabela `notifications`. Respeita `notification_settings.push_enabled` e usa as assinaturas em `push_subscriptions`.

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

Opcional: `PUSH_ADMIN_EMAIL` (ex.: `mailto:suporte@exemplo.org`) no Dashboard ou `supabase secrets set PUSH_ADMIN_EMAIL="mailto:suporte@exemplo.org"`.

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

Assim, qualquer insert em `notifications` (trigger de audiência, `send-notification`, `audiencia-reminder-d1`, etc.) dispara o envio de Web Push para os navegadores inscritos.

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

1. Usuário ativa “Push” em **Preferências** no app e permite notificações no navegador.
2. O frontend registra o **Service Worker** (`/sw-push.js`), obtém a assinatura (PushManager) e grava em `push_subscriptions`.
3. Quando algo insere uma linha em `notifications`, o webhook chama `send-web-push` com o payload do INSERT.
4. A função verifica `push_enabled`, lê as assinaturas do usuário e envia o push (título, mensagem, URL) via Web Push API.
5. O navegador exibe a notificação; ao clicar, abre a URL (ex.: `/audiencias/123`).

## Respostas

- `{ "success": true, "sent": 1 }` – push enviado.
- `{ "success": true, "sent": 0, "reason": "no_subscriptions" }` – usuário não tem assinatura (não ativou push neste dispositivo).
- `{ "success": true, "sent": 0, "reason": "vapid_not_configured" }` – secret `VAPID_KEYS` não configurado.

Assinaturas que retornam 410/404 são removidas da tabela automaticamente.
