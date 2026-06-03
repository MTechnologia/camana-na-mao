# Mapeamento de Rotas V2 — Câmara na Mão

| Campo | Valor |
|--------|--------|
| **Data de referência** | 06/maio/2026 |
| **Versão** | 2.0 |
| **Fonte principal** | `src/App.tsx` |

---

## 1) Status da última atualização (git)

**Branch local:** `dev`  
**Relação com remoto:** `dev...origin/dev` (alinhado)  
**Último commit em HEAD:** `66553ceb` (merge do PR #208)

### Alterações identificadas no último merge em HEAD

**Arquivos alterados:**

- `src/components/analytics/VolumeFilters.test.tsx` (novo)
- `src/components/analytics/VolumeFilters.tsx` (novo)
- `src/components/analytics/VolumeOverviewTab.tsx` (novo)
- `src/components/analytics/volumeFiltersConstants.ts` (novo)
- `src/hooks/useReportsVolume.test.ts` (novo)
- `src/hooks/useReportsVolume.ts` (novo)
- `src/lib/regionMapping.ts` (novo)
- `src/pages/admin/ReportsAnalyticsPage.tsx` (alterado)

**Leitura de impacto:**

- Não foram adicionadas/removidas rotas em `src/App.tsx` no último merge.
- O impacto recente foi concentrado em **analytics admin** (filtros e volume de relatos).

---

## 2) Mapa atualizado de rotas (frontend)

### 2.1 Rotas públicas (sem login)

- `/welcome`
- `/login`
- `/register`
- `/confirmar-email`
- `/reset-password`
- `/nova-senha`
- `/privacidade`
- `/docs` → redirect para `/admin/docs/overview`
- `/docs/overview` → redirect para `/admin/docs/overview`
- `*` → NotFound

### 2.2 Rotas protegidas (usuário autenticado)

- `/`
- `/onboarding`
- `/perfil`
- `/perfil/visitas`
- `/perfil/:userId`
- `/perfil/dados-pessoais`
- `/perfil/interesses`
- `/perfil/dados-demograficos`
- `/perfil/endereco`
- `/perfil/preferencias`
- `/perfil/inscricoes`
- `/perfil/consentimentos`
- `/perfil/exportar-dados`
- `/perfil/direitos`
- `/configuracoes/acessibilidade`
- `/notificacoes`
- `/busca`
- `/relatos`
- `/conversas`
- `/audiencias`
- `/audiencias/:id`
- `/audiencias/:id/participar`
- `/audiencias/minhas-inscricoes` → redirect para `/perfil/inscricoes?aba=audiencias`
- `/institucional/agenda`
- `/institucional/vereadores`
- `/institucional/vereadores/:id`
- `/institucional/conheca-camara`
- `/institucional/comissoes`
- `/institucional/camara-explica`
- `/institucional/escola-parlamento`
- `/institucional/noticias`
- `/institucional/noticias/:id`
- `/servicos-proximos`
- `/servicos/favoritos`
- `/servico/:id`
- `/avaliar`
- `/avaliar/:visitId`
- `/avaliacoes/historico`
- `/transporte` → redirect para `/relatos`
- `/transporte/novo`
- `/transporte/padroes`
- `/relatos/padroes` → redirect para `/transporte/padroes`
- `/transporte/historico`
- `/transporte/meus-relatos` (alias para histórico)
- `/paineis`
- `/paineis/avancado`
- `/paineis/criar`
- `/paineis/piores-servicos`
- `/analytics` → redirect para `/paineis`
- `/analytics/advanced` → redirect para `/paineis/avancado`
- `/analytics/criar-painel` → redirect para `/paineis/criar`
- `/relato-urbano`
- `/relato-urbano/manual`
- `/relato-urbano/historico`
- `/debug/rbac`
- `/test-dimension-rating`
- `/test-wait-time`
- `/test-infra-rating`
- `/test-task-4`

### 2.3 Rotas de gabinete (proteção de vereador)

- `/gabinete`
- `/gabinete/manifestacoes`
- `/gabinete/encaminhamentos`

**Obs.:** encapsuladas por `ProtectedVereadorRoute`.

### 2.4 Rotas admin (gestor + admin)

- `/admin`
- `/admin/notifications`
- `/admin/analytics`
- `/admin/trends`
- `/admin/reports-heatmap`
- `/admin/classification-accuracy`
- `/admin/exports`
- `/admin/reports`
- `/admin/referrals`
- `/admin/commissions`
- `/admin/docs` → redirect para `/admin/docs/overview`
- `/admin/docs/overview`

### 2.5 Rotas admin-only (apenas admin)

- `/admin/users`
- `/admin/audit-logs`
- `/admin/service-corrections`
- `/admin/settings/n8n`
- `/admin/settings/n8n-monitoring`
- `/admin/settings/accessibility`

### 2.6 Aliases e redirecionamentos de compatibilidade

**Perfil e configurações:**

- `/profile` → `/perfil`
- `/profile/personal` → `/perfil/dados-pessoais`
- `/profile/interests` → `/perfil/interesses`
- `/profile/demographics` → `/perfil/dados-demograficos`
- `/profile/address` → `/perfil/endereco`
- `/profile/preferences` → `/perfil/preferencias`
- `/settings/accessibility` → `/configuracoes/acessibilidade`

**Notificações e busca:**

- `/notifications` → `/notificacoes`
- `/search` → `/busca`

**Admin:**

- `/admin/comissions` → `/admin/commissions`
- `/admin/executive` → `/admin`
- `/admin/reports-analytics` → `/admin/analytics`
- `/admin/analytics/advanced` → `/admin/analytics`
- `/admin/sentiment-analysis` → `/admin/analytics`

**Documentação:**

- `/docs` → `/admin/docs/overview`
- `/docs/overview` → `/admin/docs/overview`

---

## 3) Observações técnicas da V2

- O roteamento central permanece em `src/App.tsx` com **React Router**.
- Há uso de `lazy()` para a maior parte das páginas.
- As proteções por papel são aplicadas por:
  - `ProtectedRoute` (usuário autenticado)
  - `ProtectedAdminRoute` (gestor/admin)
  - `ProtectedAdminOnlyRoute` (admin)
  - `ProtectedVereadorRoute` (escopo gabinete)

---

## 4) Pendências recomendadas

1. Validar se rotas de teste (`/test-*`) devem continuar ativas em produção.
2. Revisar consolidação de aliases antigos para reduzir superfície de manutenção.
3. Se necessário para auditoria funcional, complementar este documento com **mapeamento menu → rota → permissão**.

---

## Nota de reconciliação com o código (pós-V2)

Em branches que integrem trabalhos recentes, `src/App.tsx` pode conter **rotas admin adicionais** não listadas nas secções 2.4–2.5 deste snapshot (ex.: triagem, padrões, previsões, anomalias, analytics de avaliações, permissões, agendamentos). Quando houver divergência, prevalece o **roteamento no repositório**; este ficheiro deve ser atualizado na próxima revisão do mapa.
