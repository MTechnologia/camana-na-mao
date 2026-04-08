# process-pending-visits

RN-AVA-002: expira visitas `pending` com **48h+** sem `service_ratings`; envia **um** lembrete (`notifications.type = evaluation_reminder`) para visitas **24h–48h** sem avaliação, com `reminder_sent = true` após o insert.

## Agendamento (8h e 14h, fuso local)

Recomendado: **Google Cloud Scheduler** (ou equivalente), **duas execuções diárias** no fuso **America/Sao_Paulo**:

- Expressão cron: `0 8,14 * * *` com **time zone** `America/Sao_Paulo` (8h e 14h de Brasília).

**URL:** `https://<PROJECT_REF>.supabase.co/functions/v1/process-pending-visits`  
**Método:** POST  
**Headers:** `Authorization: Bearer <publishable ou anon>`, `apikey: <mesma chave>`, `Content-Type: application/json`, e se usar secret: `x-cron-secret: <CRON_SECRET>` (igual ao `process-scheduled-notifications`).

## pg_cron (opcional, plano com extensão)

Exemplo em `supabase/sql/pg_cron_process_pending_visits.example.sql` (ajustar URL, chaves e `pg_net`/`vault` conforme o projeto).

## Deploy

```bash
supabase functions deploy process-pending-visits
```

## Resposta JSON

- `expired`: linhas atualizadas para `status = expired` (sem rating, `created_at` ≤ now−48h).
- `reminders`: lembretes inseridos e `reminder_sent` marcado.
- `reminder_failed`: falhas parciais (log no Supabase).

## Migration

`20260410100000_service_visits_reminder_sent.sql` — coluna `reminder_sent`, índices e função `expire_pending_visits_over_48h()`.
