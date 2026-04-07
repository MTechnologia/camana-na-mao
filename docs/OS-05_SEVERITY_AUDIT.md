# OS-05 — Auditoria de severidade / risco (IA)

**Guia de testes para o revisor (cenários, aceite, entregáveis):** [`OS-05_GUIA_TESTES_REVISOR.md`](./OS-05_GUIA_TESTES_REVISOR.md)

## Onde vive o log

| Artefato | Caminho / uso |
|----------|----------------|
| Tabela | `public.report_severity_audit_log` |
| Migração | `supabase/migrations/20260324120000_report_severity_audit_log.sql` |
| Escrita na criação do relato | `supabase/functions/ai-orchestrator/lib.ts` — `insertReportSeverityAuditLog` após insert em `create_urban_report` / `create_transport_report` |
| Tipos TS | `src/integrations/supabase/types.ts` → `report_severity_audit_log` |

## Campos relevantes para aceite

- **ID do evento:** `id` (uuid)
- **Métrica:** `metric` — `risk_level` (urbano) ou `severity` (transporte)
- **Valores:** `previous_value` (null na criação), `new_value`
- **Justificativa:** `justification` (regra, texto do usuário ou auto-inferência)
- **Contexto:** `source_snippet` (trecho da descrição, até 500 chars no insert)
- **Confiança (quando aplicável):** `confidence` (ex.: auto-inferência urbana)
- **Timestamp:** `created_at`
- **Extras:** `metadata` (jsonb), `engine` (default `ai-orchestrator`)

## RLS

- **SELECT:** `admin` e `gestor` (`user_roles`)
- **INSERT:** dono do relato (`urban_reports.user_id` / `transport_reports.user_id` = `auth.uid()`)

O orchestrador usa o cliente Supabase com JWT do cidadão, então o insert pós-criação do relato satisfaz a policy.

## Próximo passo (UI moderação)

Em `UnifiedReportDrawer` (ou drawer equivalente), para o relato aberto:

```ts
// urbano
.from('report_severity_audit_log')
.select('*')
.eq('urban_report_id', reportId)
.order('created_at', { ascending: false })

// transporte
.eq('transport_report_id', reportId)
```

## QA — exemplos SQL

```sql
-- Últimos eventos
select * from public.report_severity_audit_log
order by created_at desc limit 20;

-- Por relato urbano
select * from public.report_severity_audit_log
where urban_report_id = '<uuid>'
order by created_at;
```
