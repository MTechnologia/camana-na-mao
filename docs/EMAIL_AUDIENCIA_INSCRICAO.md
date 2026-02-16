# E-mail de confirmação de inscrição em audiências

Quando o cidadão se inscreve no app (videoconferência ou manifestação por escrito), podemos enviar um **e-mail de confirmação** no estilo do e-mail oficial da CMSP (protocolo, aviso sobre direito à fala, link, dados da audiência e do inscrito).

---

## O que configurar do nosso lado

Depende de como a Câmara quiser fazer:

| Cenário | O que a Câmara faz | O que nós setamos |
|--------|---------------------|--------------------|
| **A – Verificação de domínio** | Autoriza o envio e adiciona no DNS de `saopaulo.sp.leg.br` os registros que nós enviamos (gerados no nosso SendGrid ou Resend). | **Só** o secret **AUDIENCIA_EMAIL_FROM** = `Câmara Municipal de São Paulo <noreply@saopaulo.sp.leg.br>`. Continuamos usando a nossa **SENDGRID_API_KEY** ou **RESEND_API_KEY** já existente. **Nenhuma chave nova da Câmara.** |
| **B – Câmara nos passa uma API Key** | Cria uma API Key (SendGrid ou Resend) na conta deles, restrita a envio, e nos envia. | **AUDIENCIA_EMAIL_FROM** como acima **e** um secret extra com a chave deles (ex.: **CMSP_EMAIL_API_KEY**). A função precisaria ser ajustada para usar essa chave quando o remetente for da CMSP. |

Recomendação: **Cenário A**. Do nosso lado basta **AUDIENCIA_EMAIL_FROM**; a Câmara só precisa autorizar e colocar os registros DNS que nós geramos no painel do SendGrid/Resend.

---

## Rascunho de e-mail para enviar ao cliente (Câmara)

Você pode enviar algo nesse sentido (ajuste nomes e contatos):

---

**Assunto:** Configuração de e-mail de confirmação de inscrição – Audiências Públicas (app Câmara na Mão)

Prezados,

No aplicativo Câmara na Mão, as inscrições para audiências públicas (videoconferência e manifestação por escrito) são feitas pelo próprio app. Gostaríamos de enviar ao cidadão um **e-mail de confirmação** em nome da Câmara, no mesmo padrão do que já é enviado quando a inscrição é feita pelo portal (remetente: **Câmara Municipal de São Paulo &lt;noreply@saopaulo.sp.leg.br&gt;**).

Para isso, precisamos de autorização e de um passo técnico do lado de vocês. Há duas formas possíveis:

**Opção 1 – Verificação do domínio (recomendada)**  
- Nós utilizamos o serviço de envio de e-mail do projeto (SendGrid ou Resend).  
- A Câmara precisaria **autorizar** o envio em nome de **noreply@saopaulo.sp.leg.br** e **incluir no DNS do domínio saopaulo.sp.leg.br** alguns registros (CNAME/SPF/DKIM) que nós geramos e enviamos para vocês.  
- Do nosso lado, configuramos apenas o remetente como esse e-mail; **não precisamos de senhas nem chaves da Câmara**.

**Opção 2 – Uso de uma API Key da Câmara**  
- Se a Câmara já envia e-mails (por exemplo pelo SendGrid) com noreply@saopaulo.sp.leg.br, é possível criar uma **API Key restrita** apenas para envio e nos repassar.  
- Nós armazenaríamos essa chave de forma segura e a usaríamos somente para esses e-mails de confirmação de inscrição.

Solicitamos que indiquem com quem podemos tratar desse tema (TI, comunicação ou outro setor) e qual das opções preferem, para alinharmos os detalhes técnicos.

Atenciosamente,  
[Seu nome / Equipe Câmara na Mão]

---

---

## Opção 1: onde gerar os registros DNS

Os registros (CNAME, SPF, DKIM) são gerados no painel do **provedor de e-mail do projeto** (SendGrid ou Resend). Quem tem acesso à conta do projeto faz o passo a passo abaixo e envia a lista de registros para a Câmara incluir no DNS de `saopaulo.sp.leg.br`.

### SendGrid

1. Acesse [SendGrid](https://sendgrid.com) → **Settings** → **Sender Authentication** → **Domain Authentication**.
2. Clique em **Authenticate Your Domain**.
3. Em **Domain to authenticate**, informe: `saopaulo.sp.leg.br`.
4. Em **Advanced Settings**, escolha o DNS host (ex.: “Other”) se a Câmara não estiver na lista.
5. SendGrid exibe a tabela de **registros DNS** (tipo, host, valor). Copie ou exporte essa tabela (ou tire um print) e envie ao cliente.
6. Após a Câmara adicionar os registros no DNS deles, volte ao SendGrid e clique em **Verify** para conferir. O status deve ficar “Verified”.

### Resend

1. Acesse [Resend](https://resend.com) → **Domains** → **Add Domain**.
2. Informe o domínio: `saopaulo.sp.leg.br`.
3. Resend mostra os **registros** (geralmente 3 CNAME para verificação e DKIM). Copie a lista (tipo, nome, valor) e envie ao cliente.
4. Depois que a Câmara configurar o DNS, em Resend clique em **Verify**; o domínio deve aparecer como verificado.

Resumo: **geramos** os registros no painel do SendGrid ou do Resend (ao iniciar a verificação do domínio `saopaulo.sp.leg.br`); a Câmara só precisa **reproduzir** esses registros no DNS deles.

---

## Usar remetente da Câmara: `noreply@saopaulo.sp.leg.br`

1. **Autorização da Câmara**  
   O domínio e o endereço são da Câmara. É necessário que ela **autorize** o envio e faça a parte técnica (DNS na opção 1, ou fornecimento de API Key na opção 2).

2. **Verificação do domínio (opção 1)**  
   No **SendGrid** ou **Resend** do **projeto**, inicie a verificação do domínio `saopaulo.sp.leg.br` (ver seção acima). O provedor gera os registros DNS; a Câmara adiciona esses registros no DNS dela.

3. **Secrets no Supabase**  
   - **AUDIENCIA_EMAIL_FROM**: `Câmara Municipal de São Paulo <noreply@saopaulo.sp.leg.br>`  
   - Credenciais já usadas no projeto: **SENDGRID_API_KEY** + **SENDGRID_FROM** (ou **RESEND_***).  
   - Se for opção 2: secret adicional com a API Key fornecida pela Câmara (e ajuste na função para usá-la).

4. **Webhook no Supabase**  
   - **Database** → **Webhooks** → **Create a new hook**  
   - Tabela: `audiencia_participacoes`, evento **Insert**  
   - URL: `https://<project-ref>.supabase.co/functions/v1/send-audiencia-inscricao-email`  
   - Header: `Authorization: Bearer <SUPABASE_ANON_KEY>`

Enquanto o remetente da Câmara não estiver configurado, use um remetente que você já use (ex.: **SENDGRID_FROM** = `Câmara na Mão <noreply@seudominio.com>`). A função usa **AUDIENCIA_EMAIL_FROM** quando estiver definido; caso contrário, usa o mesmo remetente das outras notificações.

Detalhes da função e dos secrets: [supabase/functions/send-audiencia-inscricao-email/README.md](../supabase/functions/send-audiencia-inscricao-email/README.md).
