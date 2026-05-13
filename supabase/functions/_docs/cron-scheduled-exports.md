# cron-scheduled-exports

Disparador horário que verifica `scheduled_exports`, calcula janela
relativa do período e cria `export_jobs` para o `process-export-job`
processar.

## Endpoint

```
POST {SUPABASE_URL}/functions/v1/cron-scheduled-exports
```

## Auth

`X-Cron-Secret: <CRON_SECRET>` (apenas cron, sem path para o client).

## Payload

Vazio. A função busca todos os agendamentos ativos cujo cron expression
case com o horário atual.

## Como funciona

1. Lê `scheduled_exports` com `is_active = true`.
2. Para cada um, avalia se o cron bate com `now()` (tolerância +/- 30s).
3. Resolve a janela relativa (`yesterday`, `last_7d`, `previous_month`, etc) → `startDate`/`endDate`.
4. Cria um registro novo em `export_jobs` com os filtros + role do owner.
5. Invoca `process-export-job` com o `jobId`.
6. Registra resultado em `scheduled_export_executions`.

## Variáveis de ambiente

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
```

## Cron recomendado

```
Frequency: 0 * * * *           (toda hora cheia)
Timezone:  America/Sao_Paulo
```
