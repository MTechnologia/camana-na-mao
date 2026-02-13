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
