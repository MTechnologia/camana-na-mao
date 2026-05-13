# archive-audit-logs

Move registros de `audit_logs` com mais de 12 meses para `audit_logs_archive`,
cumprindo a retenção mínima exigida em compliance (HU-12.4) sem inflar a
tabela principal.

## Endpoint

```
POST {SUPABASE_URL}/functions/v1/archive-audit-logs
```

## Auth (dupla)

- Header `X-Cron-Secret: <CRON_SECRET>` (cron diário)
- Header `Authorization: Bearer <JWT>` de admin (acionamento manual)

## Payload (opcional)

```json
{
  "retention_months": 12
}
```

| Campo | Default | Notas |
|---|---|---|
| `retention_months` | 12 | Limite de retenção em meses (cuidado: registros mais antigos são movidos) |

## Response 200

```json
{
  "status": "success",
  "result": {
    "status": "success",
    "cutoff": "2025-05-21T00:00:00.000Z",
    "archived_rows": 1247
  }
}
```

## Como funciona

1. Chama a RPC Postgres `purge_old_audit_logs(_retention_months)`.
2. Dentro da RPC:
   - Calcula cutoff = `now() - interval '12 months'`.
   - INSERT em `audit_logs_archive` os registros com `created_at < cutoff`.
   - Seta flag `SET LOCAL audit_logs.bypass_immutability = 'true'` (autorizado apenas dentro dessa RPC).
   - DELETE em `audit_logs` os registros movidos.
3. Retorna contagem de linhas arquivadas.

## Imutabilidade

`audit_logs` tem trigger que rejeita UPDATE/DELETE comum (HU-12.3). A função
de retenção é a **única** com permissão de deletar, via flag interna do PG.
Nenhum admin pode burlar essa restrição via SQL Editor.

## Variáveis de ambiente

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
```

## Exemplo curl

```bash
curl -X POST "$SUPABASE_URL/functions/v1/archive-audit-logs" \
  -H "X-Cron-Secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"retention_months": 12}'
```

## Recomendação de cron

```
Frequency: 0 3 * * *      (todo dia 03:00)
Timezone:  America/Sao_Paulo
```

Horário escolhido para evitar pico de uso e tempo suficiente entre o
`detect-anomalies-daily` (06:00) — não há dependência mas mantém ordem
lógica.
