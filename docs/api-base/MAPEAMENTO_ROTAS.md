# Mapeamento Completo de Rotas - Câmara na Mão

**Data:** Janeiro 2026  
**Versão:** 1.1  
**Última atualização:** Janeiro 2026

---

## 🚀 Referência Rápida

### URLs Principais

| Ambiente | Frontend | Backend API |
|----------|----------|-------------|
| **Desenvolvimento** | `http://localhost:5173` | `http://localhost:54321/functions/v1` |
| **Produção** | `https://camara-na-mao.onrender.com` | `https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1` |

### Rotas Mais Usadas

| Rota | Descrição |
|------|-----------|
| `/` | Página inicial |
| `/perfil` | Perfil do usuário |
| `/conversas` | Chat com IA |
| `/relatos` | Hub de relatos |
| `/transporte` | Relatos de transporte |
| `/relato-urbano` | Relatos urbanos |
| `/audiencias` | Audiências públicas |
| `/institucional/vereadores` | Lista de vereadores |
| `/admin` | Dashboard admin (protegido) |

### APIs Mais Usadas

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/fetch-vereadores` | POST | Lista de vereadores |
| `/fetch-noticias` | POST | Notícias da Câmara |
| `/fetch-agenda` | POST | Agenda cerimonial |
| `/api/v1/vereadores` | GET | API REST - Vereadores |
| `/ai-orchestrator` | POST | Chat com IA |

---

## 📋 Índice

1. [Rotas do Frontend (React Router)](#rotas-do-frontend-react-router)
2. [APIs do Backend (Edge Functions)](#apis-do-backend-edge-functions)
3. [Endpoints REST da API](#endpoints-rest-da-api)
4. [Tabelas do Banco de Dados](#tabelas-do-banco-de-dados)
5. [Resumo por Categoria](#resumo-por-categoria)
6. [Controle de Acesso (RBAC)](#controle-de-acesso-rbac)
7. [Detalhamento Técnico](#detalhamento-técnico)

---

## 🌐 Rotas do Frontend (React Router)

**Base URL:** `http://localhost:5173` (dev) ou `https://camara-na-mao.onrender.com` (prod)

### 🔐 Autenticação

| Rota | Componente | Descrição | Status |
|------|-----------|-----------|--------|
| `/welcome` | `Welcome` | Tela de boas-vindas | ✅ |
| `/login` | `Login` | Login de usuário | ✅ |
| `/register` | `Register` | Registro de novo usuário | ✅ |
| `/reset-password` | `ResetPassword` | Recuperação de senha | ✅ |
| `/nova-senha` | `UpdatePassword` | Atualização de senha | ✅ |
| `/onboarding` | `Onboarding` | Onboarding inicial | ✅ |

### 🏠 Páginas Principais

| Rota | Componente | Descrição | Status |
|------|-----------|-----------|--------|
| `/` | `Home` | Página inicial | ✅ |
| `/busca` | `SearchPage` | Busca geral | ✅ |
| `/conversas` | `ConversationsPage` | Conversas com IA | ✅ |
| `/notificacoes` | `Notifications` | Notificações do usuário | ✅ |
| `/relatos` | `ReportsHub` | Hub de relatos | ✅ |

**Redirects (compatibilidade):**
- `/search` → `/busca`
- `/notifications` → `/notificacoes`

### 👤 Perfil do Usuário

| Rota | Componente | Descrição | Status |
|------|-----------|-----------|--------|
| `/perfil` | `Profile` | Perfil principal | ✅ |
| `/perfil/dados-pessoais` | `PersonalInfoPage` | Informações pessoais | ✅ |
| `/perfil/interesses` | `InterestsPage` | Interesses do usuário | ✅ |
| `/perfil/dados-demograficos` | `DemographicsPage` | Dados demográficos | ✅ |
| `/perfil/endereco` | `AddressPage` | Endereço | ✅ |
| `/perfil/preferencias` | `PreferencesPage` | Preferências | ✅ |
| `/configuracoes/acessibilidade` | `AccessibilityPage` | Configurações de acessibilidade | ✅ |

**Redirects (compatibilidade):**
- `/profile` → `/perfil`
- `/profile/personal` → `/perfil/dados-pessoais`
- `/profile/interests` → `/perfil/interesses`
- `/profile/demographics` → `/perfil/dados-demograficos`
- `/profile/address` → `/perfil/endereco`
- `/profile/preferences` → `/perfil/preferencias`
- `/settings/accessibility` → `/configuracoes/acessibilidade`

### 🎤 Audiências Públicas

| Rota | Componente | Descrição | Status |
|------|-----------|-----------|--------|
| `/audiencias` | `Audiencias` | Lista de audiências | ✅ |
| `/audiencias/:id` | `AudienciaDetailPage` | Detalhes da audiência | ✅ |
| `/audiencias/:id/participar` | `ParticipacaoPage` | Inscrição em audiência | ✅ |

### 🏛️ Institucional

| Rota | Componente | Descrição | Status |
|------|-----------|-----------|--------|
| `/institucional/agenda` | `AgendaCMSP` | Agenda da Câmara | ✅ |
| `/institucional/vereadores` | `Vereadores` | Lista de vereadores | ✅ |
| `/institucional/vereadores/:id` | `VereadorDetailPage` | Perfil do vereador | ✅ |
| `/institucional/conheca-camara` | `ConhecaCamara` | Conheça a Câmara | ✅ |
| `/institucional/camara-explica` | `CamaraExplica` | Câmara Explica | ✅ |
| `/institucional/escola-parlamento` | `EscolaParlamento` | Escola do Parlamento | ✅ |
| `/institucional/noticias` | `Noticias` | Notícias da Câmara | ✅ |
| `/institucional/noticias/:id` | `NoticiaDetailPage` | Detalhes da notícia | ✅ |

### 🚌 Transporte

| Rota | Componente | Descrição | Status |
|------|-----------|-----------|--------|
| `/transporte` | `TransportReportPage` | Página principal de transporte | ✅ |
| `/transporte/novo` | `NewReportPage` | Novo relato de transporte | ✅ |
| `/transporte/padroes` | `PatternsPage` | Padrões de relatos | ✅ |
| `/transporte/meus-relatos` | `MyReportsPage` | Histórico de relatos | ✅ |

### 🏙️ Relatos Urbanos

| Rota | Componente | Descrição | Status |
|------|-----------|-----------|--------|
| `/relato-urbano` | `UrbanReportPage` | Página principal de relatos urbanos | ✅ |
| `/relato-urbano/manual` | `ManualReportPage` | Novo relato manual | ✅ |
| `/relato-urbano/historico` | `ReportHistoryPage` | Histórico de relatos urbanos | ✅ |

### 🏥 Serviços Públicos

| Rota | Componente | Descrição | Status |
|------|-----------|-----------|--------|
| `/servicos-proximos` | `NearbyServicesPage` | Serviços próximos | ✅ |
| `/servico/:id` | `ServiceDetailPage` | Detalhes do serviço | ✅ |
| `/avaliar` | `EvaluationPage` | Avaliar serviço | ✅ |
| `/avaliar/:visitId` | `EvaluationPage` | Avaliar visita específica | ✅ |

### 📊 Analytics / Painéis

| Rota | Componente | Descrição | Status | Acesso |
|------|-----------|-----------|--------|--------|
| `/paineis` | `AnalyticsDashboard` | Dashboard de analytics | ✅ | Cidadão Engajado, Gestor, Admin |
| `/paineis/avancado` | `AdvancedAnalytics` | Análise avançada | ✅ | Cidadão Engajado, Gestor, Admin |
| `/paineis/criar` | `CreateDashboard` | Criar novo painel | ✅ | Cidadão Engajado, Gestor, Admin |

**Redirects (compatibilidade):**
- `/analytics` → `/paineis`
- `/analytics/advanced` → `/paineis/avancado`
- `/analytics/criar-painel` → `/paineis/criar`

### 👨‍💼 Admin (Protegidas)

| Rota | Componente | Descrição | Status | Acesso |
|------|-----------|-----------|--------|--------|
| `/admin` | `AdminDashboard` | Dashboard administrativo | ✅ | Gestor, Admin |
| `/admin/notifications` | `AdminNotifications` | Gerenciar notificações | ✅ | Gestor, Admin |
| `/admin/analytics` | `ReportsAnalyticsPage` | Analytics de relatos | ✅ | Gestor, Admin |
| `/admin/users` | `UserManagement` | Gerenciar usuários | ✅ | **Apenas Admin** |
| `/admin/exports` | `ExportLogs` | Logs de exportação | ✅ | Gestor, Admin |
| `/admin/audit-logs` | `AuditLogs` | Logs de auditoria | ✅ | **Apenas Admin** |
| `/admin/reports` | `ReportsManagement` | Gerenciar relatos | ✅ | Gestor, Admin |
| `/admin/referrals` | `ReferralsManagement` | Gerenciar encaminhamentos | ✅ | Gestor, Admin |
| `/admin/settings/n8n` | `N8NIntegration` | Integração N8N | ✅ | **Apenas Admin** |
| `/admin/settings/n8n-monitoring` | `N8NMonitoring` | Monitoramento N8N | ✅ | **Apenas Admin** |
| `/admin/settings/accessibility` | `AccessibilitySettings` | Configurações de acessibilidade | ✅ | **Apenas Admin** |

**Redirects (rotas removidas):**
- `/admin/executive` → `/admin`
- `/admin/reports-analytics` → `/admin/analytics`
- `/admin/analytics/advanced` → `/admin/analytics`
- `/admin/sentiment-analysis` → `/admin/analytics`

### 📚 Documentação

| Rota | Componente | Descrição | Status |
|------|-----------|-----------|--------|
| `/docs` | `Navigate` | Redireciona para `/docs/overview` | ✅ |
| `/docs/overview` | `PublicDocumentationPage` | Documentação pública | ✅ |

### 🐛 Debug

| Rota | Componente | Descrição | Status |
|------|-----------|-----------|--------|
| `/debug/rbac` | `DebugRBAC` | Debug de RBAC | ✅ |

### ❌ 404

| Rota | Componente | Descrição | Status |
|------|-----------|-----------|--------|
| `*` | `NotFound` | Página não encontrada | ✅ |

---

## 🔧 APIs do Backend (Edge Functions)

**Base URL:** `https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1`

### 🌍 Públicas (Sem Autenticação)

| Função | Endpoint | Método | Descrição | Status |
|--------|----------|--------|-----------|--------|
| `fetch-vereadores` | `/functions/v1/fetch-vereadores` | POST | Busca vereadores da API SP Legis | ✅ |
| `fetch-noticias` | `/functions/v1/fetch-noticias` | POST | Busca notícias do Portal | ✅ |
| `fetch-agenda` | `/functions/v1/fetch-agenda` | POST | Busca agenda cerimonial | ✅ |
| `google-places-autocomplete` | `/functions/v1/google-places-autocomplete` | POST | Autocomplete de endereços | ✅ |
| `google-places-details` | `/functions/v1/google-places-details` | POST | Detalhes de lugares | ✅ |
| `api-router` | `/functions/v1/api-router` | GET | Health check do router | ✅ |
| `api-router` | `/functions/v1/api-router/vereadores` | GET | Lista de vereadores (RESTful) | ✅ |
| `api-router` | `/functions/v1/api-router/vereadores/:id` | GET | Detalhes de vereador (RESTful) | ✅ |
| `n8n-webhook` | `/functions/v1/n8n-webhook` | POST | Webhook N8N | ✅ |
| `n8n-callback` | `/functions/v1/n8n-callback` | POST | Callback N8N | ✅ |

### 🔒 Protegidas (Requerem JWT)

| Função | Endpoint | Método | Descrição | Status |
|--------|----------|--------|-----------|--------|
| `ai-orchestrator` | `/functions/v1/ai-orchestrator` | POST | Orquestrador de IA | ✅ |
| `suggest-council-members` | `/functions/v1/suggest-council-members` | POST | Sugestão de vereadores | ✅ |
| `analyze-sentiment` | `/functions/v1/analyze-sentiment` | POST | Análise de sentimento | ✅ |
| `recommend-services` | `/functions/v1/recommend-services` | POST | Recomendação de serviços | ✅ |
| `send-notification` | `/functions/v1/send-notification` | POST | Envio de notificações | ✅ |
| `generate-embeddings` | `/functions/v1/generate-embeddings` | POST | Geração de embeddings | ✅ |
| `populate-knowledge-base` | `/functions/v1/populate-knowledge-base` | POST | População de base de conhecimento | ✅ |
| `notify-n8n` | `/functions/v1/notify-n8n` | POST | Notificação N8N | ✅ |
| `delete-user` | `/functions/v1/delete-user` | POST | Exclusão de usuário | ✅ |

---

## 🌐 Endpoints REST da API

**Base URL:** `https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api/v1`

### ✅ Implementados

| Endpoint | Método | Descrição | Status | Autenticação |
|----------|--------|-----------|--------|--------------|
| `/api-router/vereadores` | GET | Lista de vereadores | ✅ | Não |
| `/api-router/vereadores/:id` | GET | Detalhes do vereador | ✅ | Não |

**URLs de acesso (formato RESTful):**
- `https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores`
- `https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores/:id`

**Exemplos:**
- Lista: `GET /functions/v1/api-router/vereadores?page=1&limit=20`
- Detalhes: `GET /functions/v1/api-router/vereadores/joao-silva`

### ⏳ Planejados (Não Implementados)

| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api-router/projetos` | GET | Lista de projetos | ⏳ |
| `/api-router/projetos/:id` | GET | Detalhes do projeto | ⏳ |
| `/api-router/projetos/:id/tramitacao` | GET | Tramitação do projeto | ⏳ |
| `/api-router/projetos/:id/autores` | GET | Autores do projeto | ⏳ |
| `/api-router/sessoes` | GET | Lista de sessões | ⏳ |
| `/api-router/sessoes/:id` | GET | Detalhes da sessão | ⏳ |
| `/api-router/sessoes/:id/pauta` | GET | Pauta da sessão | ⏳ |
| `/api-router/sessoes/:id/pauta-estendida` | GET | Pauta estendida | ⏳ |
| `/api-router/noticias` | GET | Lista de notícias | ⏳ |
| `/api-router/noticias/:id` | GET | Detalhes da notícia | ⏳ |
| `/api-router/noticias/search` | GET | Busca de notícias | ⏳ |
| `/api-router/audiencias` | GET | Lista de audiências | ⏳ |
| `/api-router/audiencias/:id` | GET | Detalhes da audiência | ⏳ |
| `/api-router/transparencia/vereadores/:id/creditos` | GET | Créditos de vereador | ⏳ |
| `/api-router/transparencia/vereadores/:id/debitos` | GET | Débitos de vereador | ⏳ |
| `/api-router/transparencia/liderancas/creditos` | GET | Créditos de liderança | ⏳ |
| `/api-router/transparencia/liderancas/debitos` | GET | Débitos de liderança | ⏳ |
| `/api-router/notifications` | GET | Lista de notificações | ⏳ |
| `/api-router/notifications/:id` | GET | Detalhes da notificação | ⏳ |
| `/api-router/notifications/:id/read` | PUT | Marcar como lida | ⏳ |
| `/api-router/notifications/read-all` | PUT | Marcar todas como lidas | ⏳ |

---

## 🗄️ Tabelas do Banco de Dados

### Principais Tabelas

| Tabela | Descrição | Status |
|--------|-----------|--------|
| `profiles` | Perfis de usuários | ✅ |
| `user_demographics` | Dados demográficos | ✅ |
| `user_addresses` | Endereços dos usuários | ✅ |
| `user_interests` | Interesses dos usuários | ✅ |
| `user_roles` | Roles RBAC dos usuários | ✅ |
| `urban_reports` | Relatos urbanos | ✅ |
| `transport_reports` | Relatos de transporte | ✅ |
| `council_member_referrals` | Encaminhamentos para vereadores | ✅ |
| `ai_conversations` | Conversas com IA | ✅ |
| `notifications` | Notificações | ✅ |
| `analytics_dashboards` | Dashboards analíticos | ✅ |
| `audiencia_participations` | Participações em audiências | ✅ |
| `council_members_cache` | Cache de vereadores | ✅ |
| `news_cache` | Cache de notícias | ✅ |
| `agenda_cache` | Cache de agenda | ✅ |
| `api_cache` | Cache da API REST | ✅ |
| `api_rate_limits` | Rate limiting | ✅ |
| `export_logs` | Logs de exportação | ✅ |
| `audit_logs` | Logs de auditoria | ✅ |

### Funções do Banco

| Função | Descrição | Status |
|--------|-----------|--------|
| `get_user_roles(user_id)` | Retorna roles do usuário | ✅ |
| `has_role(user_id, role)` | Verifica se usuário tem role | ✅ |
| `has_any_role(user_id, roles[])` | Verifica se usuário tem alguma role | ✅ |
| `match_documents(query_embedding, ...)` | Busca semântica | ✅ |
| `notify_admins(message, ...)` | Notifica administradores | ✅ |
| `generate_protocol_code(type)` | Gera código de protocolo | ✅ |
| `get_reports_with_demographics(...)` | Relatórios com demografia | ✅ |

---

## 📊 Resumo por Categoria

### Frontend (React Router)

| Categoria | Quantidade | Detalhes |
|-----------|------------|----------|
| **Total de rotas** | 60+ | Incluindo redirects |
| **Rotas principais** | ~50 | Rotas funcionais |
| **Rotas públicas** | ~35 | Acesso sem autenticação |
| **Rotas protegidas (Admin)** | ~11 | Gestor e Admin |
| **Rotas protegidas (RBAC)** | ~4 | Analytics (Cidadão Engajado+) |
| **Redirects** | ~10 | Compatibilidade com versões antigas |

**Distribuição por categoria:**
- 🔐 Autenticação: 6 rotas
- 🏠 Principais: 5 rotas
- 👤 Perfil: 7 rotas (+ 7 redirects)
- 🎤 Audiências: 3 rotas
- 🏛️ Institucional: 8 rotas
- 🚌 Transporte: 4 rotas
- 🏙️ Relatos Urbanos: 3 rotas
- 🏥 Serviços: 4 rotas
- 📊 Analytics: 3 rotas (+ 3 redirects)
- 👨‍💼 Admin: 11 rotas (+ 4 redirects)
- 📚 Documentação: 2 rotas
- 🐛 Debug: 1 rota

### Backend (Edge Functions)

| Categoria | Quantidade | Detalhes |
|-----------|------------|----------|
| **Total de funções** | 18 | Edge Functions |
| **Funções públicas** | 8 | Sem autenticação JWT |
| **Funções protegidas** | 10 | Requerem autenticação |

**Distribuição por categoria:**
- 🌍 Públicas (Dados): 5 funções (fetch-vereadores, fetch-noticias, fetch-agenda, google-places-*)
- 🔧 Infraestrutura: 3 funções (api-router, n8n-webhook, n8n-callback)
- 🤖 IA/ML: 3 funções (ai-orchestrator, analyze-sentiment, recommend-services)
- 📊 Analytics: 2 funções (suggest-council-members, generate-embeddings)
- 🔔 Notificações: 2 funções (send-notification, notify-n8n)
- 🗄️ Dados: 2 funções (populate-knowledge-base, delete-user)

### API REST

| Categoria | Quantidade | Status |
|-----------|------------|--------|
| **Endpoints implementados** | 2 | ✅ Vereadores |
| **Endpoints planejados** | 20+ | ⏳ Em planejamento |

**Endpoints implementados:**
- ✅ `GET /api/v1/vereadores` - Lista com paginação e filtros
- ✅ `GET /api/v1/vereadores/:id` - Detalhes de vereador

**Endpoints planejados:**
- ⏳ Projetos (4 endpoints)
- ⏳ Sessões (4 endpoints)
- ⏳ Notícias (3 endpoints)
- ⏳ Audiências (2 endpoints)
- ⏳ Transparência (4 endpoints)
- ⏳ Notificações (4 endpoints)

### Banco de Dados

| Categoria | Quantidade | Status |
|-----------|------------|--------|
| **Tabelas principais** | 20+ | ✅ Implementadas |
| **Tabelas de cache** | 3 | ✅ Implementadas |
| **Tabelas de sistema** | 3 | ✅ Implementadas |
| **Funções SQL** | 7 | ✅ Implementadas |
| **Políticas RLS** | Todas | ✅ Implementadas |

**Tabelas por categoria:**
- 👤 Usuários: 5 tabelas (profiles, user_*, user_roles)
- 📝 Relatos: 3 tabelas (urban_reports, transport_reports, council_member_referrals)
- 🤖 IA: 1 tabela (ai_conversations)
- 🔔 Notificações: 1 tabela (notifications)
- 📊 Analytics: 1 tabela (analytics_dashboards)
- 🎤 Audiências: 1 tabela (audiencia_participations)
- 💾 Cache: 3 tabelas (council_members_cache, news_cache, agenda_cache)
- 🔧 Sistema: 3 tabelas (api_cache, api_rate_limits, export_logs, audit_logs)

---

## 🔐 Controle de Acesso (RBAC)

### Perfis de Usuário

1. **Cidadão** (padrão)
   - Acesso a todas as rotas públicas
   - Pode criar relatos (urbanos e transporte)
   - Pode ver próprios relatos
   - ❌ Não pode encaminhar para vereador
   - ❌ Não pode ver dashboards

2. **Cidadão Engajado**
   - Todas as permissões de Cidadão
   - ✅ Pode encaminhar para vereador
   - ✅ Pode criar e ver dashboards

3. **Gestor**
   - Todas as permissões de Cidadão Engajado
   - ✅ Acesso à área admin (exceto configurações)
   - ✅ Pode responder relatos
   - ✅ Pode exportar dados

4. **Admin**
   - Todas as permissões de Gestor
   - ✅ Acesso completo à área admin
   - ✅ Pode gerenciar usuários
   - ✅ Pode ver logs de auditoria
   - ✅ Pode configurar sistema

5. **Vereador**
   - Acesso aos dados do gabinete
   - (Definir permissões específicas)

6. **Assessor**
   - Suporte ao gabinete
   - (Definir permissões específicas)

---

## 📝 Notas Importantes

### Rotas com Lazy Loading

A maioria das rotas usa `lazy()` para code splitting e melhor performance. Apenas as rotas críticas são carregadas imediatamente:
- `Home`
- `NotFound`
- `Profile`
- `Notifications`

### Prefetching

O sistema implementa prefetching inteligente:
- Prefetch de rotas comuns após 1s do carregamento inicial
- Prefetch baseado na rota atual (ex: se está em `/transporte`, prefetch de `/transporte/novo`)

### Proteção de Rotas

- **`ProtectedAdminRoute`:** Protege rotas para Gestor e Admin
- **`ProtectedAdminOnlyRoute`:** Protege rotas apenas para Admin
- **RBAC via hooks:** `useUserRole()` verifica permissões em componentes

### Status de Implementação

- ✅ **Implementado e funcionando**
- ⏳ **Planejado mas não implementado**
- 🔧 **Em desenvolvimento**
- ❌ **Desabilitado/Removido**

---

---

## 📝 Detalhamento Técnico

### Estrutura de Rotas do Frontend

O arquivo `src/App.tsx` contém todas as definições de rotas usando React Router v6:

```typescript
// Rotas críticas (carregadas imediatamente)
- Home, NotFound, Profile, Notifications

// Rotas com lazy loading (code splitting)
- Auth pages, Profile pages, Citizen pages, etc.
```

**Arquivos relacionados:**
- `src/App.tsx` - Definição de todas as rotas
- `src/components/layout/AppLayout.tsx` - Layout e títulos das rotas
- `src/components/navigation/PrefetchLink.tsx` - Prefetching de rotas
- `src/components/admin/ProtectedAdminRoute.tsx` - Proteção de rotas admin
- `src/components/admin/ProtectedAdminOnlyRoute.tsx` - Proteção exclusiva admin

### Estrutura de Edge Functions

As Edge Functions estão organizadas em:
- **`supabase/functions/`** - Diretório raiz das funções
- **`supabase/functions/shared/`** - Código compartilhado entre funções
  - `api-response.ts` - Respostas padronizadas
  - `auth.ts` - Autenticação e autorização
  - `cache.ts` - Sistema de cache
  - `rate-limit.ts` - Rate limiting
  - `validation.ts` - Validação de dados
- **`supabase/functions/api/v1/`** - Endpoints da API REST versionada
- **`supabase/functions/api-router/`** - Router central da API REST

### Acesso às APIs

**Edge Functions Diretas:**
```bash
POST https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/{function-name}
```

**API REST Versionada (formato RESTful):**
```bash
GET https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/{resource}
```

**Exemplos:**
```bash
# Lista de vereadores
GET /functions/v1/api-router/vereadores

# Detalhes de vereador
GET /functions/v1/api-router/vereadores/joao-silva

# Com filtros (query parameters)
GET /functions/v1/api-router/vereadores?page=1&limit=10&search=Silva
```

### Testando as Rotas

#### Frontend (Local)
```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Acessar rotas no navegador
http://localhost:5173/
http://localhost:5173/perfil
http://localhost:5173/admin
```

#### Edge Functions (Local)
```bash
# Iniciar Supabase local
npx supabase start

# Testar função
curl -X POST http://localhost:54321/functions/v1/fetch-vereadores \
  -H "Content-Type: application/json"
```

#### API REST (Produção)
```bash
# Health check
curl https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router

# Listar vereadores
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores?page=1&limit=10"

# Detalhes de vereador
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores/joao-silva"
```

### Convenções de Nomenclatura

**Frontend:**
- Rotas em português (PT-BR)
- Kebab-case para URLs (`/perfil/dados-pessoais`)
- PascalCase para componentes (`PersonalInfoPage`)

**Backend:**
- Edge Functions em inglês, kebab-case (`fetch-vereadores`)
- API REST em português, plural (`/api/v1/vereadores`)
- Métodos HTTP padrão REST (GET, POST, PUT, DELETE)

**Banco de Dados:**
- Tabelas em snake_case (`user_roles`, `council_member_referrals`)
- Funções em snake_case (`get_user_roles`, `has_role`)

---

**Última atualização:** Janeiro 2026  
**Versão do documento:** 1.1
