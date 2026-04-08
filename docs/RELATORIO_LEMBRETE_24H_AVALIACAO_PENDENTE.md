# Relatório técnico — Lembrete em 24h para avaliação pendente (OS-06 / #2517770)

## Objetivo

Implementar **RN-AVA-002**: lembrete ao cidadão para visitas **pending** sem avaliação entre **24h e 48h** de idade (`created_at`); **expirar** visitas **pending** sem avaliação com **48h ou mais**.

## Laudo de implementação

### 1. Migration (`supabase/migrations/20260410100000_service_visits_reminder_sent.sql`)

- Coluna **`reminder_sent`** `BOOLEAN NOT NULL DEFAULT false` em `service_visits`.
- Índices parciais para candidatos a lembrete (`pending`, `reminder_sent = false`) e candidatos a análise de expiração (`pending`).
- Função **`expire_pending_visits_over_48h()` → integer** (`SECURITY DEFINER`, `service_role`):
  - `UPDATE` em `service_visits` com `status = 'pending'`, `created_at <= now() - interval '48 hours'`, **sem** linha em `service_ratings` para o `visit_id`.
  - Retorna número de linhas afetadas.

### 2. Edge Function `process-pending-visits`

- Autenticação opcional via **`CRON_SECRET`** / header `x-cron-secret` (mesmo padrão de `process-scheduled-notifications`).
- **Ordem:**
  1. Chama **`expire_pending_visits_over_48h`** (visitas ≥48h sem rating).
  2. Seleciona até **200** visitas `pending`, `reminder_sent = false`, `created_at <= now−24h`, `created_at > now−48h`.
  3. Remove as que já têm `service_ratings` (consulta em lote por `visit_id`).
  4. Para cada uma: `INSERT` em `notifications` com `type = evaluation_reminder`, `action_url = /avaliar/:visitId`, `metadata` com `service_visit_id` e `service_id`; em seguida `UPDATE service_visits SET reminder_sent = true`.
- Nome do equipamento vem de `public_services` (embed na query).

### 3. Cron (8h e 14h)

- **Recomendado:** job HTTP no **Google Cloud Scheduler** (ou similar) com timezone **America/Sao_Paulo** e expressão **`0 8,14 * * *`** apontando para `POST .../functions/v1/process-pending-visits` com `Authorization` + `apikey` + `x-cron-secret` quando aplicável.
- **Alternativa:** `pg_cron` + `pg_net` — modelo comentado em `supabase/sql/pg_cron_process_pending_visits.example.sql` (depende do plano/extensões).

### 4. Integrações auxiliares

- **`config.toml`:** `[functions.process-pending-visits] verify_jwt = false`.
- **`send-web-push`:** tipo `evaluation_reminder` incluído no aviso de log quando falta `expo_push_token` (paridade com outros lembretes de cidadão).
- **`notificationTypes.ts`:** entrada **`evaluation_reminder`** para exibição na central.
- **`types.ts`:** `reminder_sent` em `service_visits` e RPC `expire_pending_visits_over_48h`.

### 5. Testes (janela 24h / 48h)

Arquivo: `supabase/functions/_shared/visit-reminder-windows_test.ts` (Deno).

| Cenário | Resultado esperado |
|--------|---------------------|
| **25h** | Elegível a lembrete; não expira |
| **23h** | Não elegível a lembrete |
| **49h** | Expira; fora da janela de lembrete |
| **47h** | Elegível a lembrete; não expira |
| **48h exatas** | Expira; fora da janela de lembrete (limite superior exclusivo) |

```bash
deno test supabase/functions/_shared/visit-reminder-windows_test.ts
# ou
npm run test:visit-reminder
```

## Evidências manuais sugeridas

1. **Lembrete:** visita `pending`, sem rating, `created_at` há ~25h, `reminder_sent = false` → após `POST` na função: linha em `notifications` (`evaluation_reminder`) e `reminder_sent = true`.
2. **Expiração:** mesma lógica com ~49h → `status = expired`, sem insert de lembrete (primeiro passo da função expira antes).
3. **Duplicidade:** segunda execução não reenvia lembrete (`reminder_sent`).

## Deploy

```bash
supabase db push
supabase functions deploy process-pending-visits
```

Configurar o agendador HTTP (ou pg_cron) conforme a seção 3.
