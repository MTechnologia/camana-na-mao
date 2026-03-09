# Crons: lembretes de audiência (1h antes e D-1)

As funções **audiencia-reminder-1h** e **audiencia-reminder-d1** inserem linhas na tabela `notifications`. O **Database Webhook** (INSERT em `notifications`) chama a Edge Function **send-web-push**, que envia o push para a bandeja do usuário (e, se configurado, e-mail/SMS). Ou seja: ao configurar os crons abaixo, o usuário recebe o lembrete na bandeja (push).

## URLs (Substitua SEU_PROJECT_REF pelo ref do projeto Supabase)

- **Lembrete 1h antes:** `https://SEU_PROJECT_REF.supabase.co/functions/v1/audiencia-reminder-1h`
- **Lembrete D-1 (24h antes):** `https://SEU_PROJECT_REF.supabase.co/functions/v1/audiencia-reminder-d1`

Exemplo (projeto atual):  
`https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/audiencia-reminder-1h`  
`https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/audiencia-reminder-d1`

## Configurar no Google Cloud Scheduler

Para cada job use:
- **Target type:** HTTP
- **URL:** uma das URLs acima
- **HTTP method:** GET ou POST
- **Auth header:** None
- **HTTP headers:** adicione `Authorization: Bearer SEU_ANON_KEY` (Supabase → Settings → API → anon public)
- **Timezone:** America/Sao_Paulo

### 1) Lembrete 1h antes

- **Name:** ex. `Lembrete_Audiencia_1h`
- **Frequency:** `*/15 * * * *` (a cada 15 minutos), para não perder a janela de 1h
- **Objetivo:** notificar usuários inscritos em videoconferência cuja audiência começa em ~45–75 min

### 2) Lembrete D-1 (24h antes / “amanhã”)

- **Name:** ex. `Lembrete_Audiencia_D1`
- **Frequency:** `0 8 * * *` (todo dia às 08:00 BRT)
- **Objetivo:** notificar usuários inscritos em audiência cuja **data** é amanhã

## Testar

- **1h:** `https://SEU_PROJECT_REF.supabase.co/functions/v1/audiencia-reminder-1h?at=2026-02-26T13:00`  
  (simula “agora” = 13:00; notifica audiências que começam entre 13:45 e 14:15)
- **D-1:** `https://SEU_PROJECT_REF.supabase.co/functions/v1/audiencia-reminder-d1?for_date=2026-02-26`  
  (notifica audiências do dia 26/02/2026)

Chame no navegador (com anon key no header) ou use “Run now” no Cloud Scheduler após criar o job.

## Deploy das funções

```bash
supabase functions deploy audiencia-reminder-1h
supabase functions deploy audiencia-reminder-d1
```

Detalhes em:
- `supabase/functions/audiencia-reminder-1h/README.md`
- `supabase/functions/audiencia-reminder-d1/README.md`

---

## Se o job falhar (Failed) no Cloud Scheduler

1. **Confirme o header:** No job, em "Configure the execution" → HTTP headers deve ter `Authorization: Bearer SEU_ANON_KEY` (anon key do Supabase → Settings → API).
2. **Logs no Supabase:** Dashboard → **Edge Functions** → **audiencia-reminder-1h** (ou **audiencia-reminder-d1**) → **Logs**. Veja o erro exato (401, 500, etc.).
3. **Deploy:** Garanta que as funções estão publicadas:  
   `supabase functions deploy audiencia-reminder-1h` e  
   `supabase functions deploy audiencia-reminder-d1`.
4. **Tabela e dados:** As funções leem `audiencia_participacoes` (tipo = `videoconferencia`, com `user_id` preenchido). Se não houver nenhuma participação nesse formato, a função responde 200 com `sent: 0`; falha só se der erro de banco ou de permissão.

---

## Push na bandeja do celular (notificação 1h / D-1)

Para o lembrete **aparecer na bandeja do celular** (e não só no e-mail e dentro do app):

1. **Token Expo no perfil:** O usuário precisa ter aberto o **app mobile** (Expo) ao menos uma vez, logado, com **permissão de notificação** concedida. O app envia o token para `profiles.expo_push_token`; sem esse token, a Edge Function `send-web-push` não envia push para o dispositivo.
2. **Preferência de push:** Em `notification_settings`, `push_enabled` não deve ser `false` (por padrão é considerado habilitado se a linha não existir).
3. **Diagnóstico:** Se o e-mail chegar mas o push na bandeja não:
   - No **Supabase** → **Edge Functions** → **send-web-push** → **Logs**, procure por `expo_push_token ausente` para esse usuário. Se aparecer, o perfil ainda não tem token: peça para abrir o app no celular, aceitar notificações e (se possível) ir em Configurações do app e garantir que notificações estão ativas.
   - Confirme em **Table Editor** → **profiles** se a linha do usuário tem `expo_push_token` preenchido (começa com `ExponentPushToken`).
4. **Deploy:** Após alterações em `send-web-push`, faça `supabase functions deploy send-web-push`.

5. **"Error fetching logs" / Job timed out em save-expo-push-token:** Esse erro pode ser do **visualizador de logs** do Supabase (timeout ao carregar os eventos), não necessariamente da função. Para confirmar se o token está sendo salvo: **Table Editor** → **profiles** → verifique se a linha do usuário tem `expo_push_token` preenchido. Se estiver vazio, abra o app no celular com boa conexão, aceite notificações e aguarde alguns segundos; a função **save-expo-push-token** foi otimizada (sem chamada extra a Auth) para reduzir timeout. O app também faz fallback de salvar o token direto em `profiles` se a Edge Function falhar.

6. **Lembrete D-1 chegou na bandeja, lembrete 1h não:** Se o D-1 aparece no celular mas o 1h não, o mais provável é que **audiencia-reminder-1h** não tenha inserido nenhuma notificação: não havia audiência na janela de 45–75 min no momento em que o cron rodou. Confira nos **Logs** da função `audiencia-reminder-1h`: deve aparecer ou `N lembretes 1h enviados` (quando envia), ou `Nenhuma audiência na janela de 1h`, ou `Lembretes 1h já enviados para esta janela`. O cron do 1h precisa rodar **a cada 15 min** (ex.: `*/15 * * * *`) para não perder a janela. Se o job rodar só 1x por hora, pode ser que naquele minuto não haja nenhuma audiência entre 45 e 75 min — aí nenhum lembrete é enviado. Faça deploy da função (`supabase functions deploy audiencia-reminder-1h`) para ativar os novos logs.

---

## Avisos por tema ("avise quando tiver audiências sobre X")

Usuários podem pedir no chat para ser avisados quando houver audiências sobre um tema (ex.: Esportes, Saúde). O assistente chama a ferramenta `subscribe_audiencia_topic_alert` e grava a preferência na tabela `audiencia_topic_alerts`.

Para que esses usuários **recebam** a notificação no app quando houver audiências agendadas daquele tema, é preciso executar a função SQL **`process_audiencia_topic_alerts()`** de forma periódica (ex.: 1x por dia). Essa função:

- Para cada (user_id, tema) em `audiencia_topic_alerts` que ainda não recebeu notificação nas últimas 24h;
- Busca audiências agendadas com data ≥ hoje cujo tema/título batem com o tema do alerta;
- Insere em `notifications` uma notificação do tipo `audiencia_topic_alert` com link para `/audiencias`.

O Database Webhook em `notifications` (INSERT) dispara a Edge Function **send-web-push**, então o usuário recebe na bandeja como os outros lembretes.

**Como agendar:**

1. **Supabase Dashboard:** Em **SQL Editor**, executar manualmente quando quiser: `SELECT process_audiencia_topic_alerts();`
2. **pg_cron (se habilitado no projeto):** `SELECT cron.schedule('audiencia-topic-alerts', '0 9 * * *', $$SELECT process_audiencia_topic_alerts()$$);` (todo dia às 09:00).
3. **Google Cloud Scheduler (recomendado):** Use a Edge Function **process-audiencia-topic-alerts** e agende assim:
   - **Name:** `Avisos_audiencia_tema` (ou outro nome)
   - **Region:** ex. `us-central1` (ou a do seu projeto)
   - **Frequency:** `0 9 * * *` (todo dia às 09:00)
   - **Timezone:** `America/Sao_Paulo`
   - **Target type:** HTTP
   - **URL:** `https://SEU_PROJECT_REF.supabase.co/functions/v1/process-audiencia-topic-alerts`
   - **HTTP method:** GET ou POST
   - **Auth header:** None
   - **HTTP headers:** `Authorization: Bearer SEU_ANON_KEY` (Supabase → Settings → API → anon public)

   Depois do job criado: `supabase functions deploy process-audiencia-topic-alerts`
