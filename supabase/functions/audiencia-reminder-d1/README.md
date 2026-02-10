# Lembrete D-1 (audiências)

Envia notificação no app para usuários inscritos em **videoconferência** cuja audiência é **amanhã** (data = dia seguinte).

## Uso

Invocar por HTTP GET ou POST (sem body). Exemplo:

```bash
curl -X POST "https://SEU_PROJETO.supabase.co/functions/v1/audiencia-reminder-d1" \
  -H "Authorization: Bearer SEU_ANON_KEY"
```

## Agendamento (cron)

Para enviar lembretes todo dia (ex.: 08:00 BRT), configure um cron externo:

- **cron-job.org** ou **EasyCron**: crie um job que faça POST para a URL da função todos os dias às 11:00 UTC (08:00 BRT).
- **Supabase**: se tiver pg_cron ou Dashboard > Cron, agende a chamada à função.

A função evita duplicatas: não envia de novo o lembrete para o mesmo (user_id, audiencia_id) nas últimas 48h.

## Deploy

```bash
supabase functions deploy audiencia-reminder-d1
```
