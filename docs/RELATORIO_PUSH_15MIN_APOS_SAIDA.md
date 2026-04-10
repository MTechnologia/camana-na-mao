# Relatório técnico — Push 15 minutos após saída do equipamento (OS-06 / #1201431)

## Objetivo

Enviar convite proativo (push / canais já usados por `send-web-push`) **15 minutos após** o preenchimento de `service_visits.departed_at`, respeitando a janela de avaliação (**RN-AVA-002**: dentro do prazo de 48 h para avaliar, e antes de `expires_at`).

## Laudo de implementação

### 1. Banco de dados

**Arquivo:** `supabase/migrations/20260408120000_notifications_scheduled_post_visit_push.sql`

- Colunas em `notifications`:
  - `scheduled_for` — quando o envio deve ocorrer (webhook imediato não entrega push enquanto estiver no futuro).
  - `push_delivered_at` — marca após o job chamar `send-web-push` (evita reenvio a cada 5 min).
- Índice parcial para filas pendentes: `scheduled_for IS NOT NULL AND push_delivered_at IS NULL`.
- **Trigger** `tr_service_visits_schedule_post_visit_notification` em `AFTER UPDATE OF departed_at` em `service_visits`:
  - Só quando `departed_at` passa de nulo → não nulo, `status = pending`.
  - `scheduled_for = departed_at + interval '15 minutes'`.
  - Só insere se `scheduled_for < LEAST(expires_at, created_at + interval '48 hours')`.
  - `type = 'visita_avaliacao_pos_saida'`, `action_url = '/avaliar/' || visit_id`, `priority = 'default'` (coluna `priority` já existia na tabela).

### 2. Webhook `send-web-push`

**Arquivo:** `supabase/functions/send-web-push/index.ts`

- Se `record.scheduled_for` existe e é **maior que agora**, retorna `skipped: true` (não envia push/e-mail/SMS).
- Tipo `visita_avaliacao_pos_saida` incluído no aviso de log quando falta `expo_push_token` (alinhado a lembretes de audiência).

### 3. Edge Function `process-scheduled-notifications`

**Arquivos:** `supabase/functions/process-scheduled-notifications/index.ts`, `README.md`

- Seleciona até 100 linhas com `scheduled_for <= now()`, `push_delivered_at` nulo.
- Para cada uma, faz `POST` para `send-web-push` com o mesmo corpo do Database Webhook (`INSERT` em `notifications`).
- Em sucesso HTTP, atualiza `push_delivered_at = now()`.
- Autenticação opcional: header `x-cron-secret` se `CRON_SECRET` estiver definido (padrão igual a outras funções de cron do projeto).

**Agendamento:** cron externo **a cada 5 minutos** (ex.: `*/5 * * * *`), conforme critério de aceite.

### 4. Configuração local

**Arquivo:** `supabase/config.toml` — `[functions.process-scheduled-notifications] verify_jwt = false` (chamada serviço/cron com service role ou secret).

### 5. Frontend — central de notificações

**Arquivo:** `src/contexts/NotificationsContext.tsx`

- Notificações com `scheduled_for` no **futuro** não entram na lista nem disparam toast no `INSERT` em tempo real.
- `UPDATE` em `notifications` dispara `fetchNotifications()` para refletir `push_delivered_at` e inclusão na central após o job.

### 6. Deep link

- `action_url` relativo: `/avaliar/<visitId>`.
- **Web:** `public/sw-push.js` já resolve `notificationclick` com `new URL(url, self.location.origin)`.
- **Mobile:** `FrontendWebView` passa a tratar toque na notificação Expo (`data.url`) e abrir a URL completa no WebView.

### 7. Tipos TypeScript

**Arquivo:** `src/integrations/supabase/types.ts` — `scheduled_for` e `push_delivered_at` em `notifications`.

### 8. Testes automatizados

**Arquivos:** `src/lib/visitPostExitNotificationSchedule.ts`, `visitPostExitNotificationSchedule.test.ts` — regra de janela espelhando o trigger.

```bash
npx vitest run src/lib/visitPostExitNotificationSchedule.test.ts
```

### 9. Testes manuais (evidência push)

| Canal | Passos resumidos |
|-------|-------------------|
| **Web** | Permissão de notificação + subscription; registrar `departed_at` em visita `pending`; aguardar 15 min + job; clicar na notificação → deve abrir `/avaliar/:id`. |
| **Mobile (Expo)** | Token em `profiles.expo_push_token`; mesmo fluxo de `departed_at`; toque na notificação → WebView navega para avaliação. |

## Rastreabilidade dos critérios de aceite

| Critério | Evidência |
|----------|-----------|
| Trigger agenda `scheduled_for = departed_at + 15 min` | Migration + função `schedule_post_visit_rating_notification`. |
| Job a cada 5 min | Documentação README + cron sugerido `*/5 * * * *`. |
| `action_url` com `/avaliar/:visitId` | INSERT no trigger. |
| Deep link web/mobile | `sw-push.js` + `FrontendWebView` listener. |
| RN-AVA-002 (48 h) | Condição `send_at < LEAST(expires_at, created_at + 48h)` no trigger + testes TS. |

**Nota:** A coluna `priority` na tabela `notifications` já existia; não foi duplicada. O escopo adiciona agendamento e rastreio de envio conforme entregáveis funcionais.
