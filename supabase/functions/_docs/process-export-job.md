# process-export-job

Worker que processa jobs de exportação (CSV/XLSX) de forma assíncrona com
paginação keyset, upload incremental para Storage e notificação por email.

## Endpoint

```
POST {SUPABASE_URL}/functions/v1/process-export-job
```

## Auth

- `X-Cron-Secret`: chamadas do `cron-scheduled-exports`
- `Authorization: Bearer <JWT>`: chamadas manuais do client (admin/gestor)

## Payload

```json
{
  "jobId": "uuid-do-export-job"
}
```

## Como funciona

1. Carrega `export_jobs` em status `pending`.
2. Muda status para `running`.
3. Pagina o dataset com keyset `(created_at, id)` em batches de 5000.
4. Serializa CSV (BOM UTF-8) ou XLSX (SheetJS) incrementalmente.
5. Faz upload para bucket `export-files` no Storage.
6. Atualiza job com `storage_path` + status `completed`.
7. Se `notify_email` setado: invoca `send-export-email` com signed URL (TTL 7d).
8. Em erro: status `failed` + `error_message`.

## Caps por role

- admin: 5M linhas CSV / 1M linhas XLSX
- gestor: 100k linhas CSV / 50k linhas XLSX

Definido em `lib/exportFields.ts` (`EXPORT_ROW_CAPS`) e espelhado no worker.

## Variáveis de ambiente

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY      # precisa pra bypassar RLS e escrever em Storage
CRON_SECRET
```

## Exemplo curl

```bash
curl -X POST "$SUPABASE_URL/functions/v1/process-export-job" \
  -H "X-Cron-Secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "..."}'
```
