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

Configure os secrets da Edge Function **send-web-push**:

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
