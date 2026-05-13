# Changelog do backend

HU-13.3 — Resumo das principais mudanças por HU. Use git log para
detalhes completos.

## HU-13 — QA & Documentação (esta PR)

### HU-13.1 — Testes e2e Playwright
- `tests/e2e/admin-dashboard.spec.ts`
- `tests/e2e/analytics-drills.spec.ts`
- `tests/e2e/triagem.spec.ts`
- `tests/e2e/exportacao.spec.ts`
- `tests/e2e/rbac.spec.ts`
- Helpers: `tests/e2e/_helpers/auth.ts`

### HU-13.2 — Performance
- Migration `20260520140000_hu13_performance_metrics.sql`
- Hook `usePerformanceMark` aplicado em ReportsAnalyticsPage, TriageKanbanPage, AuditLogs
- Script `scripts/analyze-performance.mjs` (`npm run perf:analyze`)
- RPC `purge_old_performance_metrics(days)` para retenção 90d

### HU-13.3 — Documentação
- `supabase/functions/_docs/*.md` (7 funções principais)
- `supabase/_docs/rpcs.md` (RPCs Postgres)
- `supabase/_docs/README.md` (índice)
- `supabase/_docs/changelog.md` (este arquivo)

## HU-12 — Auditoria imutável

### Migrations
- `20260518120000_hu12_audit_immutable_coverage_retention.sql`

### Adições
- `audit_logs_archive` tabela espelho
- Triggers `audit_log_changes()` aplicados em user_roles, report_triage, report_commission_referrals, report_anomalies, profiles
- Trigger `audit_logs_immutable()` bloqueia UPDATE/DELETE
- RPC `purge_old_audit_logs(months)` move > 12m para archive
- RPC `list_audit_log_actors()` para popular filtro de UI
- Edge function `archive-audit-logs` (cron diário)

## HU-11 — RBAC e gestão de usuários

### Migrations
- `20260516120000_hu11_permissions_and_user_lifecycle.sql`
- `20260516130000_hu11_rls_has_permission.sql`

### Adições
- Tabela `role_permissions` (catálogo seedado)
- `profiles.suspended_at` + `suspended_by` + `suspended_reason`
- RPCs `has_permission`, `suspend_user`, `reactivate_user`, `invite_user_role`
- Edge function `invite-user` (com dupla auth e mensagens tipadas)
- RLS refatorada em report_triage, report_anomalies, report_commission_referrals

## HU-10 — Triagem e encaminhamento

### Migrations
- `20260514120000_hu10_triagem_encaminhamento.sql`
- `20260514130000_hu10_sync_status_triage.sql`
- `20260514140000_hu10_realtime_reports.sql`

### Adições
- Tabelas: `report_triage`, `report_status_events`, `report_commission_referrals`
- Triggers de sincronização: status do relato ↔ triage_status
- RPC `list_triage_assignees()`
- Realtime habilitado para urban_reports e transport_reports

## HU-9 — Padrões, previsões e anomalias

### Migrations
- `20260512120000_hu9_3_report_anomalies.sql`
- (HU-9.1 reusou `report_patterns` existente)

### Adições
- Tabela `report_anomalies` com workflow ack/dismiss
- Edge function `detect-anomalies` (cron + dupla auth)
- Forecast client-side (HU-9.2) sem mudança de schema
- RPC `analyze_report_patterns()` (HU-9.1) já existia, reaproveitada

## HU-8 — Agendamentos de exportação

### Migrations
- `20260507120000_hu8_scheduled_exports.sql` (estende `scheduled_exports`)

### Adições
- Campos period_kind, period_relative, notify_in_app, notify_email
- Edge function `cron-scheduled-exports`
- Edge function `send-export-email`

## HU-7 — Exportações

### Migrations
- `20260507100000_hu7_export_jobs.sql`

### Adições
- Tabela `export_jobs` (status pending/running/completed/failed)
- Storage bucket `export-files` (privado, RLS)
- Edge function `process-export-job` (worker assíncrono)
- Caps por role

## HU-6 — Temas e presets

### Migrations
- `20260423120000_hu6_admin_widget_preferences.sql`
- `20260424120000_hu6_dashboard_presets.sql`

### Adições
- Tabela `admin_widget_preferences`
- Tabela `admin_dashboard_presets` (CRUD por usuário com default flag)

## Convenções de versionamento

- Cada HU consolidada em 1-3 migrations.
- Nome de arquivo: `YYYYMMDDHHMMSS_huN_descricao.sql`.
- Commit message no PR menciona HU explícita: `feat(admin): HU-X.Y descrição`.
