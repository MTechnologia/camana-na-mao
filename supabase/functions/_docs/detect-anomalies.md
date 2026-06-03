# detect-anomalies

Detecta dias com volume de relatos atipicamente alto/baixo usando z-score
sobre o forecast (HU-9.2). Roda diariamente via cron e pode ser disparada
manualmente pelo botão "Detectar agora" no `/admin/anomalias`.

## Endpoint

```
POST {SUPABASE_URL}/functions/v1/detect-anomalies
```

## Auth (dupla)

Aceita **OU**:

- Header `X-Cron-Secret: <CRON_SECRET>` (Cloud Scheduler)
- Header `Authorization: Bearer <JWT>` de usuário com role `admin` ou `gestor` (botão UI)

## Payload (opcional)

```json
{
  "historyDays": 60,
  "windowDays": 7,
  "zThreshold": 2.5
}
```

| Campo | Default | Significado |
|---|---|---|
| `historyDays` | 60 | Quantos dias de histórico usar para treinar o forecast |
| `windowDays` | 7 | Quantos dias finais avaliar para detecção |
| `zThreshold` | 2.5 | Limiar de \|z-score\| para registrar anomalia |

## Response 200

```json
{
  "status": "success",
  "history_days": 60,
  "window_days": 7,
  "z_threshold": 2.5,
  "anomalies_found": 2,
  "upserts": 2,
  "anomalies": [
    {
      "signalDate": "2026-05-10",
      "observedValue": 245,
      "expectedValue": 87.5,
      "expectedLower": 65.2,
      "expectedUpper": 109.7,
      "zScore": 7.1,
      "severity": "critical",
      "direction": "spike"
    }
  ]
}
```

## Severidade

| \|z-score\| | severity |
|---|---|
| 2.5 – 3.0 | low |
| 3.0 – 4.0 | medium |
| 4.0 – 5.0 | high |
| ≥ 5.0 | critical |

## Side-effects

- UPSERT em `report_anomalies` por `(signal_type, signal_date)`.
- Status `'active'` preservado em registros já existentes (workflow ack/dismiss).
- Não envia email/notificação (só registra).

## Variáveis de ambiente

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
```

## Exemplo curl

```bash
# Cron (Cloud Scheduler)
curl -X POST "$SUPABASE_URL/functions/v1/detect-anomalies" \
  -H "X-Cron-Secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'

# UI (admin)
curl -X POST "$SUPABASE_URL/functions/v1/detect-anomalies" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{}'
```
