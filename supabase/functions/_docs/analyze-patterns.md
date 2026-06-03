# analyze-patterns

Wrapper de edge function que invoca a RPC `analyze_report_patterns` para
detectar padrões nos relatos das últimas semanas (volume spike, recorrência,
hotspot). Roda 1x/semana via cron.

## Endpoint

```
POST {SUPABASE_URL}/functions/v1/analyze-patterns
```

## Auth

`X-Cron-Secret: <CRON_SECRET>`

## Payload

Vazio.

## Como funciona

1. Chama RPC `analyze_report_patterns()` que internamente:
   - Lê `transport_reports` + `urban_reports` últimos 30 dias.
   - Agrupa por linha de transporte + tipo de relato.
   - Identifica padrões com ≥3 ocorrências.
   - INSERT em `report_patterns` (com UNIQUE em `line_id+pattern_type+window`).
2. Chama RPC `sync_pattern_threshold_events` (best-effort).
3. Registra em `pattern_analysis_log`.

## Response

```json
{
  "status": "success",
  "result": { "reports_analyzed": 4521, "patterns_created": 12, ... },
  "threshold_sync": { ... }
}
```

## Variáveis de ambiente

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
```

## Cron recomendado

```
Frequency: 0 4 * * 1          (toda segunda, 04:00)
Timezone:  America/Sao_Paulo
```

## Permissão para acionamento manual

O botão "Reanalisar" no `/admin/padroes` NÃO chama essa edge function (precisaria
do CRON_SECRET no client). Em vez disso, chama a RPC `analyze_report_patterns`
diretamente, que tem `SECURITY DEFINER` e `GRANT EXECUTE TO authenticated`.
