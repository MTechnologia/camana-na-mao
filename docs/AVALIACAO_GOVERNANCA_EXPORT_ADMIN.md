# Avaliação de Governança, Exportação e Auditoria — Admin OS-07

## 1. Objetivo

Diagnosticar a prontidão dos itens 7, 8, 11 e 12 da OS-07 no módulo Admin, considerando governança, exportações administrativas, trilha de auditoria, matriz RBAC e dependências para exportação recorrente.

## 2. Escopo avaliado

Foram avaliados os seguintes pontos:

- rota `/admin/exports`;
- rota `/admin/users`;
- rota `/admin/audit-logs`;
- configurações admin-only;
- tabela `export_logs`;
- tabela `audit_logs`;
- RBAC aplicado no frontend;
- RBAC aplicado no backend/RLS;
- dependências para exportação recorrente.

## 3. Matriz RBAC de referência

A avaliação utilizou como referência a matriz de permissões informada para os perfis Cidadão, Cidadão Engajado, Gestor e Admin.

| Funcionalidade | Cidadão | Cidadão Engajado | Gestor | Admin |
|---|---:|---:|---:|---:|
| Exportar dados | Não | Não | Sim | Sim |
| Configurar sistema | Não | Não | Não | Sim |
| Gerenciar usuários | Não | Não | Não | Sim |
| Acessar logs de auditoria | Não | Não | Não | Sim |


## 4. Avaliação das rotas administrativas

| Rota | Perfil esperado | Status encontrado | Evidência | Observação |
|---|---|---|---|---|
| `/admin/exports` | Gestor/Admin | Encontrada | `src/App.tsx` usa `ProtectedAdminRoute` com componente `ExportLogs` | A rota está protegida por regra que permite Admin ou Gestor, aderente à matriz RBAC para exportação de dados. |
| `/admin/users` | Admin | Encontrada | `src/App.tsx` usa `ProtectedAdminOnlyRoute` com componente `UserManagement` | A rota está protegida como admin-only, aderente à matriz RBAC para gerenciamento de usuários. |
| `/admin/audit-logs` | Admin | Encontrada | `src/App.tsx` usa `ProtectedAdminOnlyRoute` com componente `AuditLogs` | A rota está protegida como admin-only, aderente à matriz RBAC para acesso aos logs de auditoria. |
| Configurações admin-only | Admin | Atendido parcialmente | `/admin/settings/n8n`, `/admin/settings/n8n-monitoring` e `/admin/settings/accessibility` usam `ProtectedAdminOnlyRoute`; `system_settings` possui RLS e policy de SELECT apenas para Admin em migration posterior | As configurações principais estão protegidas como admin-only. A rota `/admin/configuracoes/agendamentos` usa `ProtectedAdminRoute`, permitindo Admin/Gestor, e deve ser tratada como ponto de validação por estar relacionada a agendamentos/exportação recorrente. |

## 5. Avaliação de `export_logs`

| Critério | Status | Evidência/Observação |
|---|---|---|
| Existe tabela `export_logs` | Atendido | A tabela é criada na migration `20251126054447_b89cb262-627d-49d7-be44-36ad815e5482.sql`. |
| Registra usuário solicitante | Atendido | A tabela possui coluna `user_id` obrigatória, vinculada a `auth.users(id)`. |
| Registra escopo da exportação | Atendido parcialmente | A tabela possui `export_type` e `filters`, permitindo identificar tipo e filtros da exportação. Não foi identificado campo textual explícito chamado `scope`. |
| Registra formato | Atendido | A tabela possui coluna `format` obrigatória. |
| Registra filtros/parâmetros | Atendido | A tabela possui coluna `filters JSONB`. |
| Registra status | Atendido | A tabela possui coluna `status`, com valor padrão `pending`. |
| Registra histórico de execução | Atendido | A tabela possui `created_at` e `completed_at`, além da tela `src/pages/admin/ExportLogs.tsx` consultando `export_logs`. |
| Registra erro em caso de falha | Gap identificado | Não foi identificado campo específico para `error_message` na estrutura de `export_logs`. |

## 6. Avaliação de `audit_logs`

| Critério | Status | Evidência/Observação |
|---|---|---|
| Existe tabela `audit_logs` | Atendido | A tabela é criada na migration `20251127020601_6d216265-cd37-47cb-a797-85d2023bc56b.sql`. |
| Registra usuário executor | Atendido | A tabela possui coluna `user_id` relacionada a `auth.users(id)`. |
| Registra ação executada | Atendido | A tabela possui coluna obrigatória `action`. |
| Registra entidade afetada | Atendido | A tabela possui `entity_type` obrigatório e `entity_id`. |
| Registra metadata | Atendido | A tabela possui `metadata JSONB`, além de `old_values` e `new_values`. |
| Possui trilha imutável | Atendido | A migration `20260518120000_hu12_audit_immutable_coverage_retention.sql` cria trigger `trg_audit_logs_immutable_update` e `trg_audit_logs_immutable_delete`, bloqueando `UPDATE` e `DELETE`. |
| Acesso restrito a Admin | Parcialmente atendido | Existe policy para Admin visualizar todos os logs. Porém também existe policy permitindo que usuários visualizem seus próprios logs. Deve ser validado se isso está aderente à matriz RBAC, que informa acesso a logs de auditoria apenas para Admin. |

## 7. Inventário de eventos auditáveis

| Evento auditável | Obrigatório? | Perfil relacionado | Tabela esperada | Status atual | Risco |
|---|---:|---|---|---|---|
| Solicitação de exportação | Sim | Gestor/Admin | `export_logs` / `audit_logs` | Parcialmente atendido | P1 se não houver registro também em `audit_logs` |
| Exportação concluída | Sim | Gestor/Admin | `export_logs` | Atendido parcialmente | P1 se o status final não for atualizado corretamente |
| Exportação com erro | Sim | Gestor/Admin | `export_logs` | Gap identificado | P1 pela ausência de campo específico de erro |
| Alteração de perfil de usuário | Sim | Admin | `audit_logs` | Atendido parcialmente | P0 se alguma alteração de role ocorrer sem auditoria |
| Criação/desativação de usuário | Sim | Admin | `audit_logs` | Parcialmente atendido | P1/P0 conforme cobertura completa do fluxo |
| Alteração de configuração do sistema | Sim | Admin | `audit_logs` | A validar | P1 se não houver trilha |
| Acesso aos logs de auditoria | Recomendado | Admin | `audit_logs` | A validar | P1 |
| Alteração de workflow de triagem | Sim | Admin | `audit_logs` | Atendido parcialmente | A migration HU-12 indica triggers em tabelas-chave, incluindo `report_triage`. |

## 8. Avaliação RBAC no frontend

| Critério | Status | Evidência/Observação |
|---|---|---|
| Rotas admin possuem proteção por perfil | Atendido | As rotas `/admin/exports`, `/admin/users` e `/admin/audit-logs` usam componentes de proteção no `src/App.tsx`. |
| `/admin/exports` permite Gestor/Admin | Atendido | A rota usa `ProtectedAdminRoute`, que considera `isAdmin` ou `isGestor`. |
| `/admin/users` restringe a Admin | Atendido | A rota usa `ProtectedAdminOnlyRoute`, e o menu lateral só exibe o item quando `canManageUsers` é verdadeiro. |
| `/admin/audit-logs` restringe a Admin | Atendido | A rota usa `ProtectedAdminOnlyRoute`, e o menu lateral só exibe o item quando `canViewAuditLogs` é verdadeiro. |
| Configurações admin-only restringem a Admin | Atendido parcialmente | As rotas `/admin/settings/n8n`, `/admin/settings/n8n-monitoring` e `/admin/settings/accessibility` usam `ProtectedAdminOnlyRoute`. O menu lateral usa `canConfigureSystem = isAdmin` para exibir itens de configuração. A exceção a validar é `/admin/configuracoes/agendamentos`, que usa `ProtectedAdminRoute`, permitindo Admin/Gestor. |
| Menu/links administrativos respeitam perfil | Atendido | `AdminSidebar.tsx` condiciona itens sensíveis como usuários, logs de auditoria, permissões e configurações às permissões derivadas do perfil. |
## 9. Avaliação RBAC no backend/RLS

| Critério | Status | Evidência/Observação |
|---|---|---|
| Tabelas sensíveis possuem RLS ativo | Atendido | As migrations habilitam RLS em `export_logs` e `audit_logs`. |
| Backend valida perfil nas operações admin | Atendido parcialmente | A migration `20260114173000_rbac_matrix_full.sql` usa `has_role` e `has_any_role` em policies de acesso. |
| Gestor não acessa `audit_logs` | Atendido para acesso total / A validar para acesso próprio | A policy de Admin permite visualização total apenas para Admin. Porém existe policy permitindo usuário visualizar seus próprios logs. |
| Cidadão/Engajado não acessam `export_logs` | Atendido para criação/exportação | A policy `Staff can create export logs` restringe INSERT a usuários com perfil `gestor` ou `admin`. |
| `audit_logs` bloqueia UPDATE/DELETE indevido | Atendido | Triggers de imutabilidade bloqueiam `UPDATE` e `DELETE` em `audit_logs`. |
| Operações de exportação exigem Gestor/Admin | Atendido no backend/RLS | A policy `Staff can create export logs` exige `gestor` ou `admin` para inserir logs de exportação. |
| Configurações do sistema são admin-only no backend/RLS | Atendido | `system_settings` possui RLS ativo. A migration inicial permitia leitura pública, mas a migration `20260114173000_rbac_matrix_full.sql` remove a policy pública e cria SELECT restrito a Admin. A policy `Admins can manage system settings` permite gerenciamento apenas para Admin. |

## 10. Dependências para exportação recorrente

Esta OS não contempla implementação DevOps. Foram apenas registradas as dependências necessárias para exportação recorrente.

| Dependência | Necessária? | Observação |
|---|---:|---|
| Job scheduler/cron | Sim | Necessário para recorrência |
| Edge Function ou backend job | Sim | Responsável pela execução programada |
| Storage/bucket | Sim | Necessário para armazenar arquivos gerados |
| Registro em `export_logs` | Sim | Histórico de cada execução |
| Registro em `audit_logs` | Sim | Auditoria da rotina recorrente |
| Política de retenção | Recomendado | Define tempo de guarda dos arquivos |

## 11. Gaps identificados

| ID | Gap | Impacto | Severidade |
|---|---|---|---|
| GAP-01 | `export_logs` não possui campo específico para mensagem de erro da exportação. | Em caso de falha, a rastreabilidade do motivo do erro pode depender de logs externos ou mensagens não persistidas. | P1 |
| GAP-02 | `export_logs` possui `export_type` e `filters`, mas não possui campo explícito chamado `scope`. | O escopo pode ser inferido, mas a ausência de campo dedicado pode dificultar auditoria padronizada. | P1 |
| GAP-03 | `audit_logs` possui policy permitindo que usuários visualizem seus próprios logs. | A matriz RBAC informa acesso a logs de auditoria apenas para Admin. É necessário confirmar se a visualização de logs próprios é uma regra intencional ou exceção. | P1 |
| GAP-04 | Nem todos os eventos auditáveis foram confirmados ponta a ponta na análise estática. | Alguns fluxos, como alteração de configurações admin-only e acesso aos logs, ainda precisam de validação funcional ou evidência de trigger/hook específico. | P1 |
| GAP-05 | A rota `/admin/configuracoes/agendamentos` usa `ProtectedAdminRoute`, permitindo Admin/Gestor. | Caso essa tela seja classificada como configuração do sistema, há divergência com a matriz RBAC. Porém, se for considerada rotina operacional de agendamento/exportação recorrente, o acesso para Gestor pode estar aderente à regra de exportação de dados. | P1 |

## 12. Riscos P0/P1

| ID | Risco | Severidade | Recomendação |
|---|---|---|---|
| RISCO-01 | Exportações com falha podem não registrar o motivo do erro em `export_logs`, pois não foi identificado campo `error_message`. | P1 | Avaliar inclusão de campo `error_message` ou persistência do erro em `metadata/filters/status`, conforme padrão do projeto. |
| RISCO-02 | Acesso parcial a `audit_logs` por usuários não admin pode gerar divergência com a matriz RBAC, que restringe acesso a logs de auditoria ao Admin. | P1 | Confirmar se a policy “Users can view their own audit logs” é regra de negócio intencional. Caso contrário, restringir SELECT apenas a Admin. |
| RISCO-03 | Eventos críticos podem ter cobertura parcial se algum fluxo administrativo não usar hook, trigger ou função de auditoria. | P1 | Validar fluxo a fluxo: alteração de role, exclusão de usuário, configuração do sistema, triagem e exportações. |
| RISCO-04 | Possível ambiguidade de classificação em `/admin/configuracoes/agendamentos`, pois a rota permite Gestor/Admin enquanto configurações do sistema são admin-only. | P1 | Confirmar se agendamentos pertencem a configuração do sistema ou a operação de exportação recorrente permitida ao Gestor. Documentar a exceção ou ajustar a proteção da rota. |

## 13. Conclusão

Com base na avaliação realizada, a prontidão do Admin para governança, exportação e auditoria foi classificada como: **parcialmente atendida, com boa base estrutural implementada**.

Foram identificados controles relevantes já presentes no projeto, incluindo rotas administrativas protegidas, matriz RBAC aplicada no frontend, RLS em tabelas sensíveis, uso de `export_logs`, uso de `audit_logs`, triggers de imutabilidade para auditoria e dependência documentada para retenção/archive de logs.

Não foi identificado risco P0 evidente na análise estática inicial. Os principais pontos de atenção foram classificados como P1, principalmente relacionados à padronização do escopo das exportações, ausência de campo específico para erro em `export_logs`, validação da policy que permite usuários visualizarem seus próprios `audit_logs` e necessidade de confirmar a cobertura completa dos eventos auditáveis em todos os fluxos administrativos.

A recomendação é validar os gaps P1 antes da entrada em produção ou homologação final, mantendo a prioridade sobre a rastreabilidade completa das exportações e a aderência da policy de auditoria à matriz RBAC informada.