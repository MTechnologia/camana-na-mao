# RPCs Postgres

HU-13.3 — Catálogo de funções armazenadas (RPCs) disponíveis para o client
via `supabase.rpc(name, args)`.

Todas têm `SECURITY DEFINER` e `GRANT EXECUTE TO authenticated`, salvo
indicação contrária. Permissões adicionais são checadas DENTRO da função
via `has_role()` ou `has_permission()`.

---

## RBAC e gestão de usuários

### `has_role(uid uuid, role app_role) → boolean`

Checa se o usuário tem o role específico. Função utilitária usada por RLS.

### `has_any_role(uid uuid, roles app_role[]) → boolean`

Versão array: retorna `true` se o usuário tem **qualquer** dos roles.

### `has_permission(uid uuid, permission_key text) → boolean`

**HU-11.3.** Checa permissão granular via tabela `role_permissions`. Usada
em RLS de tabelas mais novas (`report_triage`, `report_anomalies`, etc).

```sql
-- Exemplo em policy:
USING (has_permission(auth.uid(), 'triage.manage'))
```

### `list_triage_assignees() → TABLE(user_id, email, full_name, role)`

**HU-10.1 / HU-11.** Lista usuários que podem ser atribuídos como responsável
de triagem (admin/gestor/assessor). Exige `triage.manage` **ou**
`triage.view_kanban` (filtro do kanban para assessores).

### `list_audit_log_actors() → TABLE(user_id, email, full_name, log_count)`

**HU-12.2.** Lista atores que aparecem em `audit_logs` (top 200 por contagem).
Exige `admin`. Usada no select de filtro da UI de auditoria.

### `invite_user_role(_new_user_id uuid, _role app_role) → void`

**HU-11.1.** Helper interno da edge `invite-user`. Apaga role antigo e
insere novo. Exige `users.invite` no caller.

### `update_user_role(_target_user_id uuid, _role app_role, _council_member_id text DEFAULT NULL) → void`

**HU-11.** Altera papel e vínculo de gabinete (vereador/assessor) de forma
atômica. Exige `users.update_role`. Não permite auto-alteração. Valida slot
único de vereador por `council_member_id`.

### `suspend_user(_target_id uuid, _reason text DEFAULT NULL) → void`

**HU-11.1.** Suspende conta (seta `profiles.suspended_at`). Exige
permissão `users.suspend`. Não permite auto-suspensão.

### `reactivate_user(_target_id uuid) → void`

**HU-11.1.** Limpa `suspended_at`. Exige `users.suspend`.

---

## Auditoria

### `purge_old_audit_logs(_retention_months integer DEFAULT 12) → jsonb`

**HU-12.4.** Move `audit_logs` mais antigos que N meses para
`audit_logs_archive`. Usa flag interna `audit_logs.bypass_immutability`
para bypassar o trigger de imutabilidade. Apenas service_role ou admin.

Retorna: `{status, cutoff, archived_rows}`.

---

## Padrões e anomalias

### `analyze_report_patterns() → jsonb`

**HU-9.1.** Análise semanal: detecta padrões nos relatos dos últimos 30 dias.
INSERT/UPSERT em `report_patterns`. Registra em `pattern_analysis_log`.

Retorna: `{status, reports_analyzed, patterns_created, window_start, window_end}`.

### `sync_pattern_threshold_events() → jsonb`

Helper que sincroniza eventos de thresholds atingidos.

---

## Triagem e sincronização de status

### `sync_triage_to_report_status() → trigger`

**HU-10 fix.** Trigger PG: quando `triage_status` muda em `report_triage`,
replica em `urban_reports.status` / `transport_reports.status`. Usa
`pg_trigger_depth()` para prevenir loop.

### `sync_report_status_to_triage() → trigger`

**HU-10 fix.** Trigger PG inverso: muda em status do relato → atualiza
`report_triage.triage_status`. UPSERT (cria triage se não existir).

### `touch_report_triage_updated_at() → trigger`

Atualiza `updated_at` e seta `resolved_at` quando passa para `resolved`.

### `touch_report_commission_referrals_updated_at() → trigger`

Idem para `report_commission_referrals`, com `responded_at` quando muda
para `accepted`/`rejected`/`processed`.

---

## Heatmap e análises geográficas

### `get_reports_heatmap_data(...) → TABLE`

**HU-4.1.** Agrega relatos por coordenadas para o mapa de calor.
Aceita filtros de tipo (`urban`, `transport`, `visits`, `all_usage`), período,
zona, categoria.

### `get_reports_trend(...) → TABLE`

**HU-1.5.** Série temporal de volume de relatos com janela móvel.

### `search_public_services_bbox(...) → TABLE`

Lookup de equipamentos públicos por bounding box. Usado em mapas.

### `search_public_services_bbox_cursor(...) → TABLE`

Versão keyset para paginação eficiente.

---

## Auditoria de mudanças (triggers)

### `audit_log_changes() → trigger`

**HU-12.1.** Função genérica. Captura INSERT/UPDATE/DELETE em qualquer
tabela e registra em `audit_logs` com `old_values` / `new_values` em JSONB.
Action label vem de `TG_ARGV[0]`.

Aplicada em: `user_roles`, `report_triage`, `report_commission_referrals`,
`report_anomalies`, `profiles` (apenas suspended_at).

### `audit_logs_immutable() → trigger`

**HU-12.3.** Bloqueia UPDATE/DELETE em `audit_logs` com RAISE EXCEPTION.
Bypass via flag `audit_logs.bypass_immutability = 'true'` (apenas dentro
da `purge_old_audit_logs`).

---

## Performance

### `purge_old_performance_metrics(_retention_days integer DEFAULT 90) → jsonb`

**HU-13.2.** Limpa `performance_metrics` antigos. Cron opcional ou
acionamento manual.

---

## Convenções

### Nomenclatura

- Funções públicas: `verbo_recurso` (ex: `suspend_user`, `list_audit_log_actors`).
- Triggers: `verbo_table_updated_at` ou descritivo (ex: `touch_X_updated_at`, `sync_X_to_Y`).
- Parâmetros: prefixo `_` (ex: `_user_id`, `_retention_months`) para evitar shadowing com colunas.

### Security

- **Padrão**: `SECURITY DEFINER` + `SET search_path = public`.
- **Permissões**: checadas dentro da função via `has_permission(auth.uid(), ...)` ou `has_role(...)`.
- **GRANT**: `EXECUTE TO authenticated` para acesso pelo client. Funções
  internas (chamadas só pelo cron/service_role) não precisam de GRANT.

### Imutabilidade

Funções com efeito destrutivo (delete em massa, alteração de role) devem:
- Validar permissão.
- Registrar em `audit_logs` via trigger automaticamente.
- Retornar resumo do que foi alterado.

### Versionamento

Mudanças em RPCs públicas devem manter compatibilidade (campos novos opcionais,
não remover existentes). Quando precisar quebrar, criar `v2` (`function_name_v2`)
e depreciar a antiga após período de transição.

---

## Como adicionar nova RPC

1. Criar migration `supabase/migrations/YYYYMMDDHHMMSS_descricao.sql`.
2. `CREATE OR REPLACE FUNCTION` + `GRANT EXECUTE TO authenticated`.
3. Adicionar entrada neste arquivo (`rpcs.md`).
4. Atualizar tipos TS via `supabase gen types typescript --linked` se aplicável.
