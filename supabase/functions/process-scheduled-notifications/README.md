# process-scheduled-notifications

Envia push (e canais já suportados por `send-web-push`) para notificações com `scheduled_for <= now()` e `push_delivered_at` nulo — ex.: lembrete **15 min após `departed_at`** em visitas a equipamentos.

## Agendamento (a cada 5 minutos)

1. Defina o secret (opcional mas recomendado): Dashboard → Edge Functions → Secrets → `CRON_SECRET`.
2. Use um agendador HTTP (ex.: [cron-job.org](https://cron-job.org), Google Cloud Scheduler):

   - **URL:** `https://<PROJECT_REF>.supabase.co/functions/v1/process-scheduled-notifications`
   - **Método:** POST
   - **Header:** `x-cron-secret: <CRON_SECRET>` (se configurado)
   - **Authorization:** pode usar `Authorization: Bearer <SERVICE_ROLE_KEY>` se preferir (a função valida `CRON_SECRET` quando existe; sem secret, aceita chamada autenticada com service role via header padrão do Supabase).

3. **Crontab sugerido:** `*/5 * * * *` (a cada 5 minutos).

## Fluxo

1. Trigger em `service_visits` insere linha em `notifications` com `scheduled_for = departed_at + 15 min` (e `action_url` `/avaliar/:visitId`).
2. Webhook de INSERT em `notifications` chama `send-web-push`, que **ignora** envio se `scheduled_for` ainda está no futuro.
3. Este job, ao rodar, chama `send-web-push` com o registro completo e marca `push_delivered_at`.

## Horário de silêncio (RN-NOT-001 / RN-NOT-003)

- Se `notification_settings.quiet_hours_start` / `quiet_hours_end` estiverem preenchidos e o horário **atual** (fuso `America/Sao_Paulo` por padrão) estiver no intervalo, a linha **não** é enviada: `scheduled_for` é atualizado para **fim do silêncio + 1 minuto** (próximo período aplicável) e o job contabiliza `deferred_quiet_hours`.
- `priority = 'critical'` **ignora** silêncio (envio imediato).
- Secret opcional: `NOTIFICATION_QUIET_HOURS_TZ` (IANA, ex. `America/Sao_Paulo`).
- A mesma lógica existe em `send-web-push` (INSERT via webhook), para não disparar push/e-mail/SMS no silêncio.

## Limite diário (RN-NOT-002 / RN-NOT-003)

- RPC `check_notification_daily_limit` + colunas `discarded_at` / `discard_reason` (migration `20260409100000_notifications_daily_limit_discard.sql`).
- Antes de chamar `send-web-push`, notificações **não críticas** com contagem diária **≥** `max_daily_notifications` (default **10**) são marcadas com `discard_reason = 'daily_limit'` e não são enviadas. Resposta JSON inclui `discarded_daily_limit`.
- `send-web-push` aplica o mesmo critério no webhook e grava `push_delivered_at` após entrega bem-sucedida (contagem diária baseada nesse campo).

## Preferência de canal (RN-NOT-004)

- O envio por push / e-mail / SMS e o caso **`delivered_in_app_only`** estão em **`send-web-push`**. A resposta JSON pode incluir `delivered_in_app_only: true` quando o usuário desligou todos os canais nas preferências.
- Este job agrega **`delivered_in_app_only`** (quantidade de itens tratados só in-app na leva).

## Teste manual

```bash
curl -s -X POST \
  -H "x-cron-secret: SEU_SECRET" \
  "https://<PROJECT_REF>.supabase.co/functions/v1/process-scheduled-notifications"
```
