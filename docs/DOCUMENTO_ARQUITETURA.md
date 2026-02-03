# Documento de Arquitetura - Câmara na Mão

**Versão:** 1.0  
**Data:** 2026-01-27  
**Projeto:** Câmara na Mão - Plataforma de Participação Cidadã  
**Projeto Supabase:** `vjzkzsczlbtmrzewffdx`

---

## Sumário Executivo

O **Câmara na Mão** é uma plataforma digital desenvolvida para a Câmara Municipal de São Paulo, oferecendo um assistente virtual inteligente que centraliza todas as interações entre cidadãos e o poder legislativo municipal. A plataforma utiliza uma arquitetura moderna baseada em BaaS (Backend as a Service), IA generativa com tool-calling, e automação de workflows para processamento assíncrono de relatos.

### Diferenciais Arquiteturais

- **Assistente Unificado**: Um único agente conversacional que detecta automaticamente a intenção do cidadão e aciona ferramentas especializadas
- **Arquitetura Serverless**: Edge Functions do Supabase para processamento síncrono e n8n para workflows assíncronos
- **IA Self-hosted**: vLLM rodando em GCP para processamento de linguagem natural com controle total
- **Mobile-first**: App React Native com WebView para validação rápida e migração gradual para nativo

---

## 1. Visão Geral da Arquitetura

### 1.1 Diagrama de Contexto

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUÁRIOS                                 │
├─────────────────────────────────────────────────────────────────┤
│  👤 Cidadão (App Mobile)  │  👔 Gestor (Web)  │  ⚙️ Admin (Web) │
└────────────────────┬──────────────────┬─────────────────────────┘
                     │                  │
                     ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CÂMARA NA MÃO                                 │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Web (React + Vite)  │  Mobile (Expo + WebView)       │
│  Supabase Edge Functions       │  n8n Workflows                 │
│  PostgreSQL + PostGIS          │  vLLM (Self-hosted)           │
└────────────────────┬──────────────────┬─────────────────────────┘
                     │                  │
                     ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INTEGRAÇÕES EXTERNAS                          │
├─────────────────────────────────────────────────────────────────┤
│  Portal CMSP  │  SP Legis API  │  Google Maps  │  Firebase FCM  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Stack Tecnológico

| Camada | Tecnologia | Propósito |
|--------|------------|-----------|
| **Frontend Web** | React 18 + TypeScript + Vite | Interface web responsiva |
| **Mobile** | Expo + React Native + TypeScript | App Android/iOS |
| **Estilização** | Tailwind CSS + shadcn/ui | Design system consistente |
| **Backend** | Supabase (BaaS) | Auth, Database, Storage, Edge Functions |
| **Banco de Dados** | PostgreSQL 15 + PostGIS + pgvector | Persistência e geolocalização |
| **IA Síncrona** | ai-orchestrator (Edge Function) | Chat e tool-calling em tempo real |
| **IA Assíncrona** | n8n + vLLM (Self-hosted) | Processamento e enriquecimento de relatos |
| **LLM** | Qwen2.5-7B-Instruct (vLLM) | Modelo de linguagem self-hosted |
| **Automação** | n8n Workflows | Processamento assíncrono e priorização |
| **Deploy Web** | Google Cloud Run | Frontend estático servido via Nginx |
| **Deploy Mobile** | EAS Build (Expo) | Geração de APK/AAB |

---

## 2. Arquitetura de Componentes

### 2.1 Frontend Web

**Localização:** `src/`  
**Build:** `npm run build` → `dist/`  
**Deploy:** Google Cloud Run (Nginx)

#### Componentes Principais

- **`src/App.tsx`**: Aplicação principal com roteamento
- **`src/pages/`**: Páginas da aplicação (56 arquivos)
- **`src/components/`**: Componentes reutilizáveis organizados por feature
- **`src/hooks/`**: Hooks customizados (38 arquivos)
- **`src/contexts/`**: Contextos React (Auth, Menu, Notifications, Onboarding)
- **`src/integrations/supabase/`**: Cliente Supabase configurado

#### Estrutura de Features

```
src/components/
├── ai/              # Componentes do assistente IA
├── admin/           # Painel administrativo
├── analytics/       # Dashboards e análises
├── audiencias/      # Gestão de audiências
├── filters/         # Filtros e buscas
├── map/             # Visualização de mapas
├── profile/         # Perfil de usuário
├── transport/       # Relatos de transporte
├── urban/           # Relatos urbanos
└── ui/              # Componentes base (shadcn/ui)
```

### 2.2 Mobile App

**Localização:** `mobile/`  
**Build:** `eas build --platform android`  
**Deploy:** EAS Build (Expo)

#### Arquitetura Mobile

- **WebView**: Carrega o frontend web via URL pública
- **Configuração**: `EXPO_PUBLIC_WEB_URL` aponta para Cloud Run
- **Diagnóstico**: Tela de teste de conectividade e APIs

#### Estrutura

```
mobile/
├── App.tsx          # Componente principal com WebView
├── src/
│   ├── screens/     # Telas nativas (se houver)
│   └── utils/       # Utilitários
└── app.json         # Configuração Expo
```

### 2.3 Backend (Supabase)

**Localização:** `supabase/`  
**Deploy:** Supabase Cloud

#### Componentes

- **Edge Functions**: `supabase/functions/`
  - `ai-orchestrator`: Assistente IA com tool-calling
  - `notify-n8n`: Notificação para workflows n8n
  - `n8n-callback`: Recebe resultados do n8n
  - `generate-embeddings`: Geração de embeddings para RAG
  - `recommend-services`: Recomendação de serviços
  - `analyze-sentiment`: Análise de sentimento

- **Migrations**: `supabase/migrations/` (57 arquivos)
  - Schema do banco de dados
  - RLS (Row Level Security) policies
  - Triggers e funções SQL
  - Extensões (PostGIS, pgvector)

- **Config**: `supabase/config.toml`
  - Configuração de Edge Functions
  - JWT verification settings

### 2.4 Banco de Dados

**Tipo:** PostgreSQL 15 + PostGIS + pgvector  
**Localização:** Supabase Cloud

#### Tabelas Principais

- **`auth.users`**: Usuários do Supabase Auth
- **`public.profiles`**: Perfis de usuários
- **`public.user_roles`**: RBAC (admin, gestor, vereador, assessor, cidadao, cidadao_engajado)
- **`public.urban_reports`**: Relatos urbanos
- **`public.transport_reports`**: Relatos de transporte
- **`public.service_ratings`**: Avaliações de serviços
- **`public.ai_conversations`**: Histórico de conversas com IA
- **`public.knowledge_base`**: Base de conhecimento para RAG
- **`public.n8n_settings`**: Configurações de integração n8n
- **`public.n8n_integration_logs`**: Logs de integração n8n

#### Extensões

- **PostGIS**: Suporte a dados geográficos
- **pgvector**: Armazenamento de embeddings para RAG
- **uuid-ossp**: Geração de UUIDs

---

## 3. Arquitetura de IA

### 3.1 AI Orchestrator (Síncrono)

**Localização:** `supabase/functions/ai-orchestrator/index.ts`  
**Tipo:** Edge Function (Deno)  
**Propósito:** Processamento síncrono de chat e tool-calling

#### Fluxo de Execução

```
1. Usuário envia mensagem via chat
2. ai-orchestrator recebe mensagem + contexto
3. LLM analisa intenção e decide qual tool chamar
4. Tool é executada (ex: create_urban_report)
5. Resposta formatada é retornada via SSE (Server-Sent Events)
```

#### Tools Disponíveis

- `create_urban_report`: Criar relato urbano
- `create_transport_report`: Criar relato de transporte
- `create_service_rating`: Criar avaliação de serviço
- `search_knowledge_base`: Buscar na base de conhecimento (RAG)
- `find_nearby_services`: Encontrar serviços próximos
- `search_audiencias`: Buscar audiências públicas
- `suggest_council_member`: Sugerir vereador
- `get_citizen_history`: Obter histórico do cidadão

#### Configuração de LLM

- **Provider**: Configurável via secrets
  - `AI_CHAT_BASE_URL`: URL do vLLM ou Lovable AI Gateway
  - `AI_CHAT_API_KEY`: Chave de API
  - `AI_CHAT_MODEL`: Modelo a usar (ex: `Qwen/Qwen2.5-7B-Instruct`)
- **Fallback**: Lovable AI Gateway (se vLLM não disponível)

### 3.2 n8n Workflows (Assíncrono)

**Localização:** n8n Cloud (`felipemtechn8n.app.n8n.cloud`)  
**Propósito:** Processamento assíncrono e enriquecimento de relatos

#### Fluxo de Workflow

```
1. Relato criado → notify-n8n Edge Function
2. notify-n8n envia webhook para n8n
3. n8n valida secret key
4. n8n prepara dados
5. n8n chama vLLM para análise
6. n8n processa resposta do vLLM
7. n8n envia callback para Supabase
8. Dados enriquecidos são salvos no banco
```

#### Estrutura do Workflow

```
[Webhook] → [IF (validar secret)] → [Code (preparar)] → 
[HTTP Request (vLLM)] → [Code (enriquecer)] → [HTTP Request (callback)]
```

#### Configuração

- **Webhook URL**: `https://felipemtechn8n.app.n8n.cloud/webhook/camara-na-mao`
- **Secret Key**: Configurado no Supabase e n8n
- **vLLM URL**: `http://35.193.16.137:8000/v1/chat/completions`
- **Callback URL**: `https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/n8n-callback`

### 3.3 vLLM (Self-hosted)

**Localização:** GCP Compute Engine (VM `llm-chat-gpu`)  
**Região:** `us-central1-b`  
**Tipo de VM:** `n1-standard-4` com GPU NVIDIA T4 (preemptible)

#### Configuração

- **Container**: `vllm/vllm-openai:latest`
- **Modelo**: `Qwen/Qwen2.5-7B-Instruct`
- **Porta**: 8000
- **API**: OpenAI-compatible (`/v1/chat/completions`)

#### Acesso

- **URL Interna**: `http://35.193.16.137:8000/v1`
- **Firewall**: Porta 8000 precisa estar aberta no GCP
- **Autenticação**: Opcional (pode usar API key)

---

## 4. Fluxos de Dados

### 4.1 Fluxo de Criação de Relato

```
┌─────────────┐
│   Cidadão   │
│  (Chat IA)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  ai-orchestrator    │
│  (Edge Function)    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Tool:              │
│  create_urban_report│
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  PostgreSQL         │
│  (urban_reports)    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  notify-n8n         │
│  (Edge Function)    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  n8n Webhook        │
│  (Workflow)         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  vLLM               │
│  (Análise)          │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  n8n-callback       │
│  (Edge Function)    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  PostgreSQL         │
│  (Dados enriquecidos)│
└─────────────────────┘
```

### 4.2 Fluxo de Chat com IA

```
┌─────────────┐
│   Cidadão   │
│  (Frontend) │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  useUnifiedAIChat   │
│  (React Hook)       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  ai-orchestrator    │
│  (SSE Stream)       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  LLM (vLLM/Lovable) │
│  (Tool Calling)     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Tool Execution     │
│  (Database/API)     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Response (SSE)     │
│  → Frontend         │
└─────────────────────┘
```

---

## 5. Segurança e Autenticação

### 5.1 Autenticação

- **Provider**: Supabase Auth
- **Métodos**: Email/Senha
- **JWT**: Tokens JWT para autenticação de API
- **RLS**: Row Level Security em todas as tabelas

### 5.2 RBAC (Role-Based Access Control)

**Roles Disponíveis:**
- `admin`: Acesso total ao sistema
- `gestor`: Gestão de relatos e usuários
- `vereador`: Acesso a relatos e análises
- `assessor`: Acesso limitado
- `cidadao`: Usuário padrão
- `cidadao_engajado`: Cidadão com mais permissões

### 5.3 Proteção de APIs

- **Edge Functions**: JWT verification (configurável via `config.toml`)
- **n8n Webhooks**: Secret key validation
- **CORS**: Configurado para domínios permitidos

---

## 6. Integrações Externas

### 6.1 Portal CMSP

- **Notícias**: WordPress API
- **Agenda**: WordPress API
- **Audiências**: WordPress API

### 6.2 SP Legis API

- **Vereadores**: Lista de vereadores e comissões
- **Proposições**: Propostas legislativas

### 6.3 Google Maps Platform

- **Geocoding**: Conversão de endereços em coordenadas
- **Places API**: Busca de lugares
- **Autocomplete**: Sugestões de endereços

### 6.4 Firebase Cloud Messaging (FCM)

- **Notificações Push**: Notificações para mobile

---

## 7. Deploy e Infraestrutura

### 7.1 Frontend Web

- **Build**: `npm run build` → `dist/`
- **Container**: Dockerfile multi-stage (Node + Nginx)
- **Deploy**: Google Cloud Run
- **URL**: `https://camana-na-mao-767943602990.southamerica-east1.run.app`

### 7.2 Mobile

- **Build**: EAS Build (Expo)
- **Deploy**: APK/AAB via EAS
- **Config**: `EXPO_PUBLIC_WEB_URL` aponta para Cloud Run

### 7.3 Backend

- **Supabase Cloud**: `vjzkzsczlbtmrzewffdx`
- **Edge Functions**: Deploy via Supabase CLI
- **Database**: PostgreSQL gerenciado pelo Supabase

### 7.4 vLLM

- **Infraestrutura**: GCP Compute Engine
- **VM**: `llm-chat-gpu` (us-central1-b)
- **Container**: Docker com vLLM
- **Acesso**: HTTP na porta 8000

### 7.5 n8n

- **Hosting**: n8n Cloud
- **URL**: `https://felipemtechn8n.app.n8n.cloud`
- **Workflows**: Configurados via UI

---

## 8. Variáveis de Ambiente

### 8.1 Frontend

- `CAMARA_URL`: URL do Supabase
- `CAMARA_PUBLISHABLE_KEY`: Chave pública do Supabase
- `CAMARA_PROJECT_ID`: ID do projeto Supabase

### 8.2 Edge Functions

- `SUPABASE_URL`: URL do Supabase
- `SUPABASE_ANON_KEY`: Chave anon do Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de service role
- `AI_CHAT_BASE_URL`: URL do vLLM ou Lovable
- `AI_CHAT_API_KEY`: Chave de API do LLM
- `AI_CHAT_MODEL`: Modelo a usar
- `AI_EMBEDDING_BASE_URL`: URL do serviço de embeddings
- `AI_EMBEDDING_API_KEY`: Chave de API de embeddings
- `AI_EMBEDDING_MODEL`: Modelo de embeddings

### 8.3 Mobile

- `EXPO_PUBLIC_WEB_URL`: URL do frontend web

---

## 9. Decisões Arquiteturais (ADRs)

### ADR-0001: Frontend Web (Vite/React) e deploy como Static Site
- **Status**: Aceito
- **Justificativa**: SPA moderna, deploy simples, compatível com WebView

### ADR-0002: Backend como BaaS (Supabase)
- **Status**: Aceito
- **Justificativa**: Acelera entrega, Auth/DB/Storage prontos, Edge Functions serverless

### ADR-0003: Mobile com Expo/React Native + WebView (PoV)
- **Status**: Aceito
- **Justificativa**: Validação rápida, permite evolução paralela

### ADR-0004: Organização por Feature e Camadas Light
- **Status**: Aceito
- **Justificativa**: Estrutura escalável, fácil manutenção

---

## 10. Monitoramento e Observabilidade

### 10.1 Logs

- **Supabase**: Logs de Edge Functions no dashboard
- **n8n**: Logs de execução de workflows
- **Frontend**: Console logs (dev) + Sentry (produção)

### 10.2 Métricas

- **Supabase**: Métricas de uso no dashboard
- **Cloud Run**: Métricas de requisições e latência
- **n8n**: Métricas de execução de workflows

---

## 11. Próximos Passos e Melhorias

### 11.1 Curto Prazo

- [ ] Abrir porta 8000 no firewall do GCP para vLLM
- [ ] Configurar Load Balancer para vLLM (produção)
- [ ] Implementar retry logic no n8n
- [ ] Adicionar monitoramento de saúde do vLLM

### 11.2 Médio Prazo

- [ ] Migrar componentes críticos do mobile para nativo
- [ ] Implementar cache de embeddings
- [ ] Adicionar testes E2E automatizados
- [ ] Configurar CI/CD completo

### 11.3 Longo Prazo

- [ ] Escalar vLLM para múltiplas instâncias
- [ ] Implementar fallback automático entre LLMs
- [ ] Adicionar analytics avançados
- [ ] Implementar A/B testing

---

## 12. Referências

- [Documentação Supabase](https://supabase.com/docs)
- [Documentação n8n](https://docs.n8n.io)
- [Documentação vLLM](https://docs.vllm.ai)
- [ADR-0001: Frontend Web](./adr/0001-frontend-web-vite-react-e-deploy-render.md)
- [ADR-0002: Backend BaaS Supabase](./adr/0002-backend-baas-supabase.md)
- [ADR-0003: Mobile Expo WebView](./adr/0003-mobile-expo-react-native-com-webview-pov.md)
- [Guia de Configuração N8N](./GUIA_CONFIGURACAO_N8N_PASSO_A_PASSO.md)
- [Especificação do AI Orchestrator](./AI_ORCHESTRATOR_SPECIFICATION.md)

---

**Última atualização:** 2026-01-27  
**Mantido por:** Equipe de Desenvolvimento Câmara na Mão
