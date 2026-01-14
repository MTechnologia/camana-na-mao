## Perfis de usuários e RBAC (Matriz de permissões)

### Perfis

- **Cidadão**
  - Objetivo: registrar relatos de forma rápida e guiada; acompanhar andamento; avaliar serviços.
- **Cidadão Engajado**
  - Objetivo: além do cidadão, participar ativamente (alertas, audiências, encaminhar demandas).
- **Gestor**
  - Objetivo: acompanhar indicadores, responder manifestações e operar a triagem.
- **Admin**
  - Objetivo: administrar sistema, permissões, logs e configurações.

### Matriz (alto nível)

| Funcionalidade | Cidadão | Cidadão Engajado | Gestor | Admin |
|---|---:|---:|---:|---:|
| Criar manifestações | ✅ | ✅ | ✅ | ✅ |
| Ver próprias manifestações | ✅ | ✅ | ✅ | ✅ |
| Avaliar serviços | ✅ | ✅ | ✅ | ✅ |
| Buscar serviços próximos | ✅ | ✅ | ✅ | ✅ |
| Inscrever-se em audiências | ✅ | ✅ | ✅ | ✅ |
| Encaminhar para vereador | ❌ | ✅ | ✅ | ✅ |
| Ver dashboards e público | ❌ | ✅ | ✅ | ✅ |
| Responder manifestações | ❌ | ❌ | ✅ | ✅ |
| Gerenciar triagem | ❌ | ❌ | ✅ | ✅ |
| Exportar dados | ❌ | ❌ | ✅ | ✅ |
| Configurar sistema | ❌ | ❌ | ❌ | ✅ |
| Gerenciar usuários | ❌ | ❌ | ❌ | ✅ |
| Acessar logs de auditoria | ❌ | ❌ | ❌ | ✅ |

### Implementação no projeto

- **Banco (Supabase)**
  - Enum `app_role` inclui: `cidadao`, `cidadao_engajado`, `gestor`, `admin` (além de roles legadas como `vereador`/`assessor`).
  - Tabela `public.user_roles` controla papéis por usuário.
  - RLS/policies aplicadas para:
    - **Dashboards**: visualizar público e criar requer `cidadao_engajado`/`gestor`/`admin`.
    - **Encaminhamento para vereador** (`council_member_referrals`): inserir requer `cidadao_engajado`/`gestor`/`admin`.
    - **Triagem/gestão de manifestações** (`urban_reports`, `transport_reports`): visualizar tudo e atualizar status requer `gestor`/`admin`.
    - **Responder manifestações** (`transport_report_responses`): gerenciar requer `gestor`/`admin`.
    - **Exportação** (`export_logs`): criar e visualizar todos requer `gestor`/`admin`.
    - **Configuração do sistema** (`system_settings`): acesso restrito a `admin`.
    - **Gestão de usuários** (`user_roles`): acesso restrito a `admin`.
    - **Logs de auditoria** (`audit_logs`): acesso total restrito a `admin`.
  - Em signup, usuários recebem role padrão `cidadao`.

- **Frontend**
  - Hook `useUserRole` expõe flags e permissões (ex.: `canReferToCouncilMember`, `canCreateDashboards`).
  - Fluxos de UI bloqueiam funcionalidades fora do perfil (além da proteção do banco via RLS).

