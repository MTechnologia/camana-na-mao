# Relatório técnico — Limite de 10 notificações por dia (OS-06 / #5398904)

## Objetivo

Implementar **RN-NOT-002** (máximo de notificações não críticas por dia, excedente descartado silenciosamente) e **RN-NOT-003** (prioridade `critical` ignora o limite), com rastreio em `discarded_at` / `discard_reason` e RPC de contagem no banco.

## Laudo de implementação

### 1. Migration (`supabase/migrations/20260409100000_notifications_daily_limit_discard.sql`)

- Colunas em `notifications`:
  - **`discarded_at`** (`TIMESTAMPTZ`, nulo se não descartada)
  - **`discard_reason`** (`TEXT`, ex. `daily_limit`)
- Índice parcial `idx_notifications_user_discarded` em `user_id` onde `discarded_at IS NOT NULL` (consultas / auditoria).
- Função **`check_notification_daily_limit(p_user_id uuid, p_tz text default 'America/Sao_Paulo') → integer`**
  - Conta linhas do usuário com:
    - `priority` distinto de `'critical'` (inclui `NULL` tratado como não crítico via `COALESCE`),
    - `discarded_at IS NULL`,
    - `push_delivered_at IS NOT NULL`,
    - data civil de `push_delivered_at` em `p_tz` igual à data civil de `now()` em `p_tz`.
  - **`SECURITY DEFINER`**, `EXECUTE` apenas para **`service_role`** (Edge Functions).

### 2. `process-scheduled-notifications`

- Seleção da fila passa a exigir **`discarded_at IS NULL`**.
- Preferências em lote incluem **`max_daily_notifications`** (fallback numérico via helper compartilhado; mínimo inválido → 10).
- Após regras de **horário de silêncio**, para não críticas:
  - chama **`check_notification_daily_limit`**;
  - se contagem **≥ limite** (default 10): `UPDATE` com `discarded_at`, `discard_reason = 'daily_limit'`, incrementa **`discarded_daily_limit`**, não chama `send-web-push`.
- Caso contrário chama `send-web-push`; se a resposta indicar **`discarded` + `daily_limit`** (corrida com outro disparo), contabiliza em `discarded_daily_limit`.
- **`push_delivered_at`** deixa de ser atualizado aqui: passa a ser responsabilidade única de **`send-web-push`** após envio bem-sucedido (evita duplicidade e mantém contagem alinhada ao que “saiu” pela função de entrega).

### 3. `send-web-push`

- Lê **`max_daily_notifications`** junto das demais preferências.
- Depois do silêncio, para não críticas: mesma RPC e regra de descarte; resposta **`{ success: true, discarded: true, reason: 'daily_limit' }`** (HTTP 200).
- Ao concluir o envio (sem descarte / sem defer por silêncio / sem erro antes), grava **`push_delivered_at`** na linha — inclusive para chamadas vindas só do **webhook** de INSERT, garantindo que o limite diário conte também notificações imediatas.

### 4. Frontend (`NotificationsContext`)

- Lista e limite de 50 itens: filtro **`.is('discarded_at', null)`** (descartes não aparecem na central).
- Realtime **INSERT**: ignora payload com **`discarded_at`** preenchido (evita toast/lista para linha já descartada na mesma transação, se no futuro houver).

### 5. Tipos TypeScript

- `src/integrations/supabase/types.ts`: colunas `discarded_at`, `discard_reason` em `notifications` e assinatura da RPC `check_notification_daily_limit`.

### 6. Testes automatizados (Deno)

- **`supabase/functions/_shared/daily-limit.ts`**: limite efetivo a partir de `max_daily_notifications` e regra **`shouldDiscardForDailyLimit`** (11ª quando `count >= limit`).
- **`supabase/functions/_shared/daily-limit_test.ts`**: cenários da 11ª notificação e crítica (via flag `isCritical` no helper; crítica não passa pelo descarte no código real).

Execução:

```bash
deno test supabase/functions/_shared/daily-limit_test.ts
# ou
npm run test:daily-limit
```

## Evidências manuais sugeridas

1. **RPC:** no SQL Editor, com usuário de teste que já tenha 10 linhas `notifications` com `push_delivered_at` hoje (mesmo dia em `America/Sao_Paulo`), `SELECT check_notification_daily_limit('uuid', 'America/Sao_Paulo');` → `10`.
2. **11ª:** inserir a 11ª não crítica e acionar o webhook ou o job; conferir `discarded_at` / `discard_reason = daily_limit` e ausência na central do app.
3. **Crítica:** mesma situação com `priority = 'critical'` → entrega segue; contagem da RPC não inclui críticas.

## Deploy

```bash
supabase db push   # ou aplicar a migration no ambiente alvo
supabase functions deploy send-web-push
supabase functions deploy process-scheduled-notifications
```

O fuso da contagem segue o mesmo da tarefa de silêncio: **`NOTIFICATION_QUIET_HOURS_TZ`** (quando definido) ou **`America/Sao_Paulo`**.
