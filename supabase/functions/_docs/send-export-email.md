# send-export-email

Worker que envia email com link de download de uma exportação concluída.
Gera signed URL temporário (TTL 7 dias) e formata template HTML.

## Endpoint

```
POST {SUPABASE_URL}/functions/v1/send-export-email
```

## Auth

`X-Cron-Secret: <CRON_SECRET>` (apenas worker interno, chamado pelo `process-export-job`).

## Payload

```json
{
  "jobId": "uuid-do-export-job"
}
```

## Como funciona

1. Carrega `export_jobs` pelo `jobId` (precisa status `completed` + `storage_path` setado).
2. Gera signed URL do arquivo via `supabase.storage.from('export-files').createSignedUrl(path, 7*24*3600)`.
3. Busca `notify_email` do job (campo no `export_jobs` ou do `scheduled_exports` se veio de agendamento).
4. Renderiza template HTML com:
   - Nome do dataset
   - Filtros aplicados
   - Total de linhas
   - Botão "Baixar arquivo" com signed URL
   - Validade do link (7 dias)
   - Brasão / cabeçalho do município
5. Envia via SendGrid (primary) ou Resend (fallback).
6. Registra envio em `export_emails_sent`.

## Variáveis de ambiente

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SENDGRID_API_KEY
SENDGRID_FROM
EMAIL_BRASAO_URL              # url da imagem do brasão usado no header
CRON_SECRET
```

## Template

`templates/export-email.html` (inline no código da função).
