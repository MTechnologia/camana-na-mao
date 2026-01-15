## Checklist de teste (RBAC)

Pré‑requisitos:
- Supabase local rodando: `npx supabase@latest status`
- Web apontando para o Supabase local (`.env.local`) e rodando: `npm run dev`

### Perfis

Use 2 usuários de teste:

1) **Cidadão (padrão)**: usuário recém cadastrado (deve ter apenas `cidadao`)
2) **Cidadão Engajado**: adicionar role `cidadao_engajado` no `public.user_roles`
3) **Gestor**: adicionar role `gestor`
4) **Admin**: adicionar role `admin`

### Comandos úteis (local)

Listar últimos usuários:

```sql
select id, email, created_at from auth.users order by created_at desc limit 5;
```

Ver roles do usuário:

```sql
select user_id, role from public.user_roles where user_id = '<USER_UUID>';
```

Promover role:

```sql
insert into public.user_roles (user_id, role)
values ('<USER_UUID>', '<ROLE>'::public.app_role)
on conflict do nothing;
```

### Validações por funcionalidade (matriz)

- **Criar manifestações (Urban/Transport)**: todos ✅
- **Ver próprias manifestações**: todos ✅
- **Avaliar serviços / Buscar serviços próximos / Inscrever-se em audiências**: todos ✅
- **Encaminhar para vereador**:
  - Cidadão ❌ (UI bloqueia + RLS bloqueia insert em `council_member_referrals`)
  - Cidadão Engajado / Gestor / Admin ✅
- **Ver dashboards públicos** (`/paineis`):
  - Cidadão ❌ (UI bloqueia + RLS bloqueia select público)
  - Cidadão Engajado / Gestor / Admin ✅
- **Responder manifestações (admin área)**:
  - Gestor / Admin ✅ (insert em `transport_report_responses`)
  - Cidadão / Engajado ❌ (sem acesso à área admin)
- **Gerenciar triagem / Ver todas as manifestações (admin área)**:
  - Gestor / Admin ✅ (select/update em `urban_reports` e `transport_reports`)
  - Cidadão / Engajado ❌
- **Exportar dados**:
  - Gestor / Admin ✅ (criar `export_logs`)
  - Cidadão / Engajado ❌
- **Configurar sistema / Gerenciar usuários / Logs de auditoria**:
  - Apenas Admin ✅
  - Gestor ❌

