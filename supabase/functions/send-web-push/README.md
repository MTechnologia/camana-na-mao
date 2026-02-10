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
