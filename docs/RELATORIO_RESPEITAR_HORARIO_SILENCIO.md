# Relatório técnico — Respeitar horário de silêncio (OS-06 / #559006)

## Objetivo

Implementar **RN-NOT-001** (respeitar `quiet_hours_start` / `quiet_hours_end` em `notification_settings`) e **RN-NOT-003** (notificações com `priority = 'critical'` ignoram o silêncio), com reagendamento automático para **fim do silêncio + 1 minuto** quando o envio seria indevido.

## Laudo de implementação

### 1. Módulo compartilhado (`supabase/functions/_shared/quiet-hours.ts`)

- **`parseTimeToMinutes`:** interpreta valores `TIME` do Postgres (`HH:MM:SS` ou `HH:MM`).
- **`isInQuietHours`:** compara o horário **local** no fuso IANA com o intervalo **inclusivo** `[start, end]`.
  - Se `start <= end`: janela no mesmo dia civil (ex.: 10:00–12:00).
  - Se `start > end`: intervalo **pernoite** (ex.: 22:00–07:00).
- **`computeNextSendAfterQuietHours`:** só retorna ISO quando está em silêncio; calcula o instante UTC correspondente a **local: `end` + 1 minuto** no dia correto:
  - Janela diurna: mesmo dia (ou dia seguinte se necessário).
  - Pernoite, perna “noite”: término no **dia seguinte** às `end + 1 min`.
  - Pernoite, perna “madrugada”: término **no mesmo dia** às `end + 1 min`.
- **`isCriticalNotification`:** verdadeiro somente para `priority === 'critical'` (valores nulos/`undefined` tratados como `normal`).
- **Fuso:** padrão `America/Sao_Paulo`; override opcional via secret de Edge Function **`NOTIFICATION_QUIET_HOURS_TZ`** (IANA).

Biblioteca **Luxon** (`esm.sh/luxon@3.4.4`) para aritmética correta em fuso.

### 2. `process-scheduled-notifications`

Antes de chamar `send-web-push` para cada linha devida (`scheduled_for <= now`, `push_delivered_at` nulo):

1. Se **`priority === 'critical'`** → segue o fluxo anterior (chama `send-web-push`, marca `push_delivered_at` em sucesso).
2. Caso contrário, carrega `quiet_hours_*` (consulta em lote por `user_id` da leva).
3. Se configurado e **`isInQuietHours`**:
   - `UPDATE notifications SET scheduled_for = <próximo permitido>`;
   - incrementa **`deferred_quiet_hours`** na resposta JSON;
   - **não** chama `send-web-push` nem preenche `push_delivered_at`.

Resposta passa a incluir: `deferred_quiet_hours`.

### 3. `send-web-push` (webhook INSERT e reprocessamentos)

Após validar `scheduled_for` (não enviar se ainda futuro) e **antes** de push/e-mail/SMS:

1. Uma única leitura de `notification_settings` inclui `quiet_hours_*` além dos canais.
2. Se **não** for crítica e existir `record.id`, e estiver em silêncio:
   - `UPDATE notifications SET scheduled_for = ...`;
   - retorno **`200`** com `{ success: true, deferred: true, reason: "quiet_hours", scheduled_for, push: 0, ... }`;
   - falha no `UPDATE` → **500** para permitir retentativa do webhook.

Assim, inserts imediatos durante o silêncio não disparam canais; o job futuro ou o próximo horário tratam o envio.

### 4. Testes automatizados

Arquivo: `supabase/functions/_shared/quiet-hours_test.ts` (Deno).

Cenários:

| Teste | Descrição |
|--------|-----------|
| `parseTimeToMinutes` | `HH:MM:SS` e `HH:MM` |
| Fora do silêncio (pernoite) | Meio da manhã → `isInQuietHours` falso, `computeNext...` nulo |
| Silêncio (pernoite, noite) | 23:00 → próximo envio 07:01 do dia seguinte (America/Sao_Paulo) |
| Silêncio (pernoite, madrugada) | 03:30 → próximo envio 07:01 do mesmo dia |
| Silêncio (mesmo dia) | 11:00 em 10:00–12:00 → 12:01 |
| Crítica | `critical` → verdadeiro; `high` → falso |

Execução (requer [Deno](https://deno.land) instalado):

```bash
deno test supabase/functions/_shared/quiet-hours_test.ts
```

Ou: `npm run test:quiet-hours`

## Evidências manuais sugeridas

1. **Silêncio + job:** configurar silêncio cobrindo o instante atual; inserir notificação com `scheduled_for` no passado; chamar `process-scheduled-notifications`; verificar resposta com `deferred_quiet_hours: 1` e `scheduled_for` avançado no Table Editor.
2. **Silêncio + webhook:** mesmo silêncio; INSERT em `notifications` sem `scheduled_for`; logs de `send-web-push` com `deferred: true`.
3. **Crítica:** `priority: 'critical'` no mesmo horário de silêncio; envio ocorre (push/e-mail conforme preferências) e **não** há `deferred`.

## Observações

- O app web hoje expõe prioridades `low` / `normal` / `high`; **`critical`** é valor de banco/API para RN-NOT-003 (inserção manual, outro serviço ou migração futura na UI).
- A função `send-notification` ainda usa lógica antiga de silêncio (string de hora local do runtime); este entregável concentra o comportamento correto em **`send-web-push`** e **`process-scheduled-notifications`**, alinhado ao disparo real de canais.

## Deploy

Após merge, publicar:

```bash
supabase functions deploy send-web-push
supabase functions deploy process-scheduled-notifications
```

Opcional: secret `NOTIFICATION_QUIET_HOURS_TZ` se o público-alvo não for sempre Brasília (UTC−3).
