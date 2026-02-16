# send-audiencia-inscricao-email

Envia **e-mail de confirmação** quando uma inscrição em audiência pública é feita pelo app (videoconferência ou manifestação por escrito). O conteúdo replica o estilo do e-mail oficial da CMSP (protocolo, aviso sobre direito à fala, link da videoconferência, dados da audiência e do inscrito).

## Remetente: usar `noreply@saopaulo.sp.leg.br`

Para que os e-mails saiam como **Câmara Municipal de São Paulo &lt;noreply@saopaulo.sp.leg.br&gt;**:

1. **Autorização**  
   O domínio `saopaulo.sp.leg.br` e o endereço `noreply@saopaulo.sp.leg.br` são da Câmara. Só é possível enviar “de” esse endereço se a **Câmara autorizar** e configurar o envio (verificação de domínio e, se for o caso, credenciais no provedor).

2. **Provedor de e-mail (SendGrid ou Resend)**  
   - A Câmara (ou o projeto, com autorização) deve **verificar o domínio** `saopaulo.sp.leg.br` no SendGrid ou no Resend (registros DNS: SPF, DKIM, etc.).  
   - Depois disso, configure no Supabase (Edge Functions → Secrets):
     - **AUDIENCIA_EMAIL_FROM**: `Câmara Municipal de São Paulo <noreply@saopaulo.sp.leg.br>`
     - E as credenciais do provedor escolhido (veja abaixo).

3. **Se o domínio ainda não estiver verificado**  
   Use um remetente que você controle (ex.: `Câmara na Mão <noreply@seudominio.com>`) em **SENDGRID_FROM** ou **RESEND_FROM**. A função usa **AUDIENCIA_EMAIL_FROM** quando definido; caso contrário, usa o mesmo remetente das outras notificações (SENDGRID_FROM / RESEND_FROM).

## Como a função é chamada

- **Database Webhook (recomendado):** ao inserir uma linha em `audiencia_participacoes`, o Supabase envia o payload para esta função.
- Configuração no Dashboard: **Database** → **Webhooks** → **Create a new hook**  
  - Table: `audiencia_participacoes`  
  - Events: **Insert**  
  - URL: `https://<project-ref>.supabase.co/functions/v1/send-audiencia-inscricao-email`  
  - Headers: `Authorization: Bearer <SUPABASE_ANON_KEY>` (ou service_role, se preferir).

## Secrets (Supabase Edge Functions)

| Secret | Obrigatório | Descrição |
|--------|-------------|-----------|
| **AUDIENCIA_EMAIL_FROM** | Não | Remetente dos e-mails de audiência. Ex.: `Câmara Municipal de São Paulo <noreply@saopaulo.sp.leg.br>`. Se não definido, usa SENDGRID_FROM ou RESEND_FROM. |
| **SENDGRID_API_KEY** | Um dos dois | API Key do SendGrid (Mail Send). |
| **SENDGRID_FROM** | Com SendGrid | Remetente padrão (usado se AUDIENCIA_EMAIL_FROM não estiver definido). |
| **RESEND_API_KEY** | Um dos dois | API Key do Resend. |
| **RESEND_FROM** | Com Resend | Remetente padrão (usado se AUDIENCIA_EMAIL_FROM não estiver definido). |
| **APP_URL** | Não | URL do app (ex.: `https://app.exemplo.org`) para o link “Abrir audiências no app” no e-mail. |

A função tenta **SendGrid** primeiro; se não houver configuração ou falhar, usa **Resend**.

## Conteúdo do e-mail

- Assunto: `CMSP | Audiências Públicas | Inscrição submetida {ap_code}` (ou “Manifestação submetida” para escrito).
- Corpo: faixa verde “Inscrição realizada com sucesso!”, registro da inscrição, número de protocolo, aviso sobre direito à fala (videoconferência), link da videoconferência (quando houver), contato da comissão, dados da audiência (código, data/hora) e do inscrito (nome, e-mail, telefone).

## Resumo para usar noreply@saopaulo.sp.leg.br

1. Câmara verifica o domínio `saopaulo.sp.leg.br` no SendGrid ou Resend.  
2. No Supabase, configurar **AUDIENCIA_EMAIL_FROM** = `Câmara Municipal de São Paulo <noreply@saopaulo.sp.leg.br>`.  
3. Configurar o webhook de `audiencia_participacoes` (INSERT) para esta função.  
4. Garantir **SENDGRID_*** ou **RESEND_*** conforme o provedor usado.

Com isso, as respostas de inscrição passam a sair com o remetente da Câmara.
