# warmup

Mantém quentes os isolates das Edge Functions críticas (mitiga cold start — A3.6).

## Por quê

Funções de baixo tráfego recriam um isolate Deno frio a cada invocação. Medição
(`node scripts/measure-edge-cold-start.mjs`):

| Função | Cold (1ª) | Warm (2ª) |
|---|---|---|
| ai-orchestrator | ~650ms | ~250ms |
| recommend-services | ~900ms | ~810ms ⚠ |
| send-notification | ~850ms | ~820ms ⚠ |
| process-scheduled-notifications | ~140ms | ~140ms |
| detect-anomalies | ~230ms | ~170ms |
| google-places-autocomplete | ~150ms | ~135ms |

`recommend-services` (user-facing) e `send-notification` ficam consistentemente
frias. Pingar OPTIONS nelas a cada poucos minutos mantém o isolate quente.

## Endpoint

```
POST {SUPABASE_URL}/functions/v1/warmup
Header: X-Cron-Secret: <CRON_SECRET>
```

Dispara OPTIONS em paralelo nos alvos (`WARM_TARGETS` em `index.ts`) e retorna o
tempo de cada um.

## Agendamento (Cloud Scheduler)

A cada 5 min em horário comercial (ex.: `*/5 7-22 * * *`, America/Sao_Paulo):

```bash
curl -X POST "$SUPABASE_URL/functions/v1/warmup" \
  -H "X-Cron-Secret: $CRON_SECRET" -H "Content-Type: application/json" -d '{}'
```

## Variáveis de ambiente

```
SUPABASE_URL
CRON_SECRET
```

## Resposta 200

```json
{
  "status": "success",
  "warmed": [
    { "fn": "ai-orchestrator", "ms": 120, "ok": true },
    { "fn": "recommend-services", "ms": 140, "ok": true }
  ]
}
```
