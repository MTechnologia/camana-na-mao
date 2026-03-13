# Configuração SendGrid para e-mail (Câmara na Mão)

Este documento descreve como configurar o **SendGrid** para envio de e-mails de notificação pelo projeto, usando o domínio **app-mtechnologia.com** e o remetente **noreply@app-mtechnologia.com**.

## Segurança da API Key

- **Nunca** commite a API Key no repositório.
- Armazene a chave apenas em **Supabase Edge Function Secrets** (ou GCP Secret Manager, se integrar por outro canal).
- Se a API Key tiver sido exposta (ex.: colada em chat ou e-mail), **gere uma nova** no painel do SendGrid e atualize o secret; em seguida, revogue a chave antiga.

## 1. SendGrid (conta e domínio)

1. Acesse [SendGrid](https://sendgrid.com) e crie uma conta ou use a existente.
2. **Verificar o domínio** (necessário para enviar com `@app-mtechnologia.com`):
   - No SendGrid: **Settings** → **Sender Authentication** → **Domain Authentication**.
   - Adicione o domínio **app-mtechnologia.com** e siga as instruções (registros DNS: CNAME para verificação e, se solicitado, para link tracking/click).
   - Aguarde a verificação (status “Verified”).

## 2. Remetente (From)

- Use o endereço: **noreply@app-mtechnologia.com**.
- No Supabase (secrets), você pode configurar o remetente de duas formas:
  - Só o e-mail: `noreply@app-mtechnologia.com` (a função usa o nome “Câmara na Mão” por padrão).
  - E-mail com nome: `Câmara na Mão <noreply@app-mtechnologia.com>`.

## 3. API Key no SendGrid

1. No SendGrid: **Settings** → **API Keys** → **Create API Key**.
2. Nome sugerido: ex. `Supabase send-web-push`.
3. Permissão: **Restricted Access** → marque apenas **Mail Send** → **Full Access** (ou o mínimo que precisar).
4. Gere e **copie a chave** (ela só é exibida uma vez). Use esta chave no passo seguinte.

## 4. Secrets no Supabase (Edge Functions)

Configure os secrets das Edge Functions que usam SendGrid:

- **SENDGRID_API_KEY**: a API Key do SendGrid (a nova que você gerou).
- **SENDGRID_FROM**: remetente, por exemplo:
  - `noreply@app-mtechnologia.com`  
  - ou `Câmara na Mão <noreply@app-mtechnologia.com>`

Opcional (para o link “Abrir no app” nos e-mails):

- **APP_URL**: URL base do app (ex.: `https://app-mtechnologia.com`).

No Dashboard: **Project Settings** → **Edge Functions** → **Secrets** → adicione/edite esses nomes e valores.

## 5. Comportamento da função send-web-push

- Se **SENDGRID_API_KEY** e **SENDGRID_FROM** estiverem definidos, a função usa **SendGrid** para enviar o e-mail de notificação.
- Se não estiverem definidos, a função pode usar **Resend** (se **RESEND_API_KEY** e **RESEND_FROM** estiverem configurados).
- O e-mail é enviado apenas quando o usuário tem **email_enabled** nas preferências de notificação e existe um endereço de e-mail (auth).

## 6. Deploy

Após configurar os secrets, faça o deploy da função:

```bash
supabase functions deploy send-web-push
```

## 7. Teste

1. No app, ative “E-mail” em **Perfil** → **Preferências** de notificação.
2. Dispare uma notificação (ex.: inserindo uma linha em `notifications` pelo Table Editor do Supabase ou via lembrete de audiência).
3. Confira a caixa de entrada (e spam) do e-mail do usuário e os logs da Edge Function no Supabase em caso de erro.

## Referência rápida (resumo)

| Item        | Valor exemplo                          |
|------------|-----------------------------------------|
| Domínio    | app-mtechnologia.com                    |
| Remetente  | noreply@app-mtechnologia.com            |
| Secret From| `Câmara na Mão <noreply@app-mtechnologia.com>` ou só `noreply@app-mtechnologia.com` |
| API Key    | Em **SENDGRID_API_KEY** (nunca no código) |

## Troubleshooting: 403 "The from address does not match a verified Sender Identity"

Se o log da função (ex.: **send-audiencia-inscricao-email** ou **send-web-push**) mostrar:

```text
SendGrid error: 403 {"errors":[{"message":"The from address does not match a verified Sender Identity...
```

significa que o **endereço usado em "from"** (o que está em **SENDGRID_FROM** ou **AUDIENCIA_EMAIL_FROM**) **não está verificado** no SendGrid. O SendGrid só permite enviar com remetentes que tenham Sender Identity verificada.

**O que fazer:**

1. Acesse o [SendGrid](https://app.sendgrid.com) → **Settings** → **Sender Authentication**.
2. Escolha uma das opções:
   - **Single Sender Verification:** adicione o e-mail exato que você usa em `SENDGRID_FROM` / `AUDIENCIA_EMAIL_FROM` (ex.: `noreply@seudominio.com`). O SendGrid envia um link de confirmação para esse e-mail; clique para verificar.
   - **Domain Authentication:** verifique o **domínio** (ex.: `seudominio.com`) com os registros DNS (CNAME/SPF/DKIM) indicados pelo SendGrid. Depois disso, qualquer endereço `@seudominio.com` poderá ser usado como "from".
3. Aguarde o status **Verified** antes de enviar de novo.
4. Confira se o valor do secret **SENDGRID_FROM** (e **AUDIENCIA_EMAIL_FROM**, se usado) é **exatamente** o e-mail verificado (ou um e-mail do domínio verificado). Ex.: `Câmara na Mão <noreply@app-mtechnologia.com>` — o domínio `app-mtechnologia.com` precisa estar verificado, ou o endereço `noreply@app-mtechnologia.com` precisa estar em Single Sender Verification.

Documentação SendGrid: [Sender Identity](https://sendgrid.com/docs/for-developers/sending-email/sender-identity/).

---

## E-mail de redefinição de senha (Send Email Hook)

O Supabase Auth pode usar um **Send Email Hook** para enviar os e-mails de autenticação (recuperação de senha, confirmação de cadastro, etc.) pela nossa Edge Function **send-email**, que envia via SendGrid. Assim, o "Esqueci minha senha" usa o mesmo remetente e provedor já configurados.

### Secrets necessários para send-email

Além de **SENDGRID_API_KEY** e **SENDGRID_FROM** (já usados por outras functions), é obrigatório:

- **SEND_EMAIL_HOOK_SECRET**: secret do hook, gerado no Dashboard em **Authentication** → **Hooks** → **Send Email Hook**. O valor vem no formato `v1,whsec_<base64>`; a function usa esse valor completo.

### Passos

1. **Deploy da function** (sem verificação JWT, pois o Auth chama com o secret do hook):
   ```bash
   supabase functions deploy send-email --no-verify-jwt
   ```
2. **Copiar a URL da function** (ex.: `https://<project-ref>.supabase.co/functions/v1/send-email`).
3. No Supabase: **Authentication** → **Hooks** → **Send Email Hook**:
   - Ative o hook.
   - **HTTP endpoint**: cole a URL da function (ex.: `https://.../functions/v1/send-email`).
   - **Secret**: gere um secret (ou use um existente); copie o valor no formato `v1,whsec_...`.
4. Em **Project Settings** → **Edge Functions** → **Secrets**, adicione:
   - **SEND_EMAIL_HOOK_SECRET**: o valor completo (ex.: `v1,whsec_xxxx`).
5. Confirme que **Redirect URLs** em **Authentication** → **URL Configuration** inclui a URL da tela de nova senha (ex.: `https://app-mtechnologia.com/nova-senha`).

Com o hook ativo, o Supabase **não** usa mais o SMTP (custom ou padrão) para envio de e-mails de auth: quem envia é a nossa function via SendGrid. O app continua chamando `supabase.auth.resetPasswordForEmail(email, { redirectTo })` como hoje; o Auth gera o token e chama a function, que envia o e-mail com o link de redefinição.
