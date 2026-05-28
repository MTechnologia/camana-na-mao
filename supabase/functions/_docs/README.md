# Edge Functions — Catálogo

HU-13.3 — Documentação das funções serverless do projeto Câmara na Mão.

## Visão geral

| Função | Tipo | Disparo | Auth |
|---|---|---|---|
| [`invite-user`](./invite-user.md) | API | Browser (admin) | JWT admin |
| [`detect-anomalies`](./detect-anomalies.md) | Cron + manual | Cloud Scheduler / botão UI | X-Cron-Secret OU JWT admin |
| [`archive-audit-logs`](./archive-audit-logs.md) | Cron + manual | Cloud Scheduler / botão UI | X-Cron-Secret OU JWT admin |
| [`process-export-job`](./process-export-job.md) | Worker | Disparado por cron-scheduled-exports / client | X-Cron-Secret OU JWT |
| [`cron-scheduled-exports`](./cron-scheduled-exports.md) | Cron | Cloud Scheduler | X-Cron-Secret |
| [`send-export-email`](./send-export-email.md) | Worker | Chamado por process-export-job | X-Cron-Secret |
| [`analyze-patterns`](./analyze-patterns.md) | Cron + manual | Cloud Scheduler / botão UI | X-Cron-Secret |
| `fetch-agenda` | Cron | Cloud Scheduler | X-Cron-Secret |
| `fetch-vereadores` | Cron | Cloud Scheduler | X-Cron-Secret |
| `fetch-noticias` | Cron | Cloud Scheduler | X-Cron-Secret |
| `fetch-audiencias` | Cron | Cloud Scheduler | X-Cron-Secret |
| `send-notification` | Worker | RPC trigger | service_role |
| `send-web-push` | Worker | Chamado internamente | service_role |
| `delete-user` | API | Browser | JWT admin |
| `delete-own-account` | API | Browser | JWT do próprio user |

## Convenções

### Headers padrão de auth

```
Content-Type: application/json
Authorization: Bearer <JWT>       # quando chamado pelo client
X-Cron-Secret: <CRON_SECRET>      # quando chamado por Cloud Scheduler
```

### Envelope de resposta

Sucesso:
```json
{
  "status": "success",
  "data": { ... },
  // ou campos específicos da função
}
```

Erro:
```json
{
  "status": "error",
  "error": "Mensagem amigável",
  "raw": "Detalhe técnico opcional"
}
```

### Status HTTP

| Código | Significado |
|---|---|
| 200 | OK |
| 207 | Multi-status (parcialmente concluído com warnings) |
| 400 | Payload inválido |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Recurso não encontrado |
| 409 | Conflito (ex: email já existe) |
| 429 | Rate limit |
| 500 | Erro interno |

## Deploy

```bash
# Deploy de uma função específica
supabase functions deploy <name> --no-verify-jwt

# Listar funções
supabase functions list

# Ver logs em tempo real
supabase functions logs <name> --tail
```

## Cron jobs (Cloud Scheduler)

| Job | Função | Frequência |
|---|---|---|
| `cron-scheduled-exports-hourly` | cron-scheduled-exports | `0 * * * *` |
| `detect-anomalies-daily` | detect-anomalies | `0 6 * * *` |
| `archive-audit-logs-daily` | archive-audit-logs | `0 3 * * *` |
| `analyze-patterns-weekly` | analyze-patterns | `0 4 * * 1` (segunda) |
| `fetch-agenda-daily` | fetch-agenda | `0 5 * * *` |
| `fetch-vereadores-weekly` | fetch-vereadores | `0 5 * * 0` |
| `fetch-noticias-hourly` | fetch-noticias | `15 * * * *` |
| `fetch-audiencias-daily` | fetch-audiencias | `30 5 * * *` |

Todos no fuso `America/Sao_Paulo` e com header `X-Cron-Secret: <CRON_SECRET>`.

## Variáveis de ambiente requeridas

Comuns a praticamente todas as funções (configurar em `supabase secrets`):

```
SUPABASE_URL                    # auto-injetado
SUPABASE_ANON_KEY               # auto-injetado
SUPABASE_SERVICE_ROLE_KEY       # auto-injetado
CRON_SECRET                     # validação de header X-Cron-Secret
SENDGRID_API_KEY                # email transacional
SENDGRID_FROM                   # remetente email
```

Específicas de algumas funções estão documentadas no MD individual.
