# process-audiencia-topic-alerts

Chama a função SQL `process_audiencia_topic_alerts()` para criar notificações para usuários que pediram "avise quando tiver audiências sobre [tema]" no chat.

## Uso

Invoke por cron (ex.: Google Cloud Scheduler) 1x por dia, ex.: às 09:00 BRT.

## Deploy

```bash
supabase functions deploy process-audiencia-topic-alerts
```

## Testar

```bash
curl -X GET "https://SEU_PROJECT_REF.supabase.co/functions/v1/process-audiencia-topic-alerts" \
  -H "Authorization: Bearer SEU_ANON_KEY"
```

Resposta esperada: `{"success":true,"message":"process_audiencia_topic_alerts executed"}`
