# Status do Roadmap de Janeiro 2026

**Data de Atualização:** 31 de Janeiro de 2026  
**Última Revisão:** Após implementação de Política de Privacidade e Consentimentos

---

## 📊 Resumo Executivo

| Item do Roadmap | Status | Progresso |
|----------------|--------|-----------|
| Regras de negócio | ✅ **Completo** | 100% |
| Controle de acesso por perfil | ✅ **Completo** | 100% |
| Definição final do escopo funcional | ✅ **Completo** | 100% |
| Mapeamento de integrações | ✅ **Completo** | 100% |
| Política de privacidade | ✅ **Completo** | 100% |
| Consentimento de dados | 🟡 **Parcial** | 70% |
| Governança LGPD | 🟡 **Parcial** | 40% |
| Definição de critérios de aceite | ❌ **Pendente** | 0% |

---

## ✅ IMPLEMENTADO

### 1. Regras de Negócio ✅ **100%**

**Status:** Completo e funcional

**Implementações:**
- ✅ Fluxos de relatos urbanos (coleta via IA, validação, salvamento)
- ✅ Fluxos de relatos de transporte (coleta via IA, validação, salvamento)
- ✅ Fluxos de avaliação de serviços (coleta via IA, salvamento)
- ✅ Sistema de encaminhamento para vereadores
- ✅ Validações de dados em todos os formulários
- ✅ Lógica de classificação automática de problemas graves
- ✅ Sistema de detecção de intenção via IA
- ✅ Tool-calling emulado (devido limitação do vLLM)

**Arquivos:**
- `supabase/functions/ai-orchestrator/index.ts` - Lógica principal
- `src/lib/validations.ts` - Validações de formulários
- `src/hooks/useUnifiedAIChat.ts` - Gerenciamento de chat

---

### 2. Controle de Acesso por Perfil ✅ **100%**

**Status:** Completo e funcional

**Implementações:**
- ✅ Sistema RBAC completo com 6 perfis:
  - `cidadao` (padrão)
  - `cidadao_engajado`
  - `gestor`
  - `admin`
  - `vereador`
  - `assessor`
- ✅ Hook `useUserRole` com permissões granulares
- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ Proteção de rotas no frontend
- ✅ Políticas de acesso por funcionalidade

**Permissões Implementadas:**
- ✅ `canReferToCouncilMember` - Encaminhar para vereador
- ✅ `canViewDashboards` - Ver dashboards públicos
- ✅ `canCreateDashboards` - Criar dashboards
- ✅ `canManageDashboards` - Gerenciar dashboards
- ✅ `canRespondManifests` - Responder manifestações
- ✅ `canManageTriage` - Gerenciar triagem
- ✅ `canManageUsers` - Gerenciar usuários
- ✅ `canConfigureSystem` - Configurar sistema
- ✅ `canViewAuditLogs` - Ver logs de auditoria

**Arquivos:**
- `src/hooks/useUserRole.ts` - Hook de permissões
- `supabase/migrations/20251126054447_*.sql` - Tabela user_roles
- `supabase/migrations/20260114170000_rbac_cidadao_engajado.sql` - Políticas RLS

---

### 3. Definição Final do Escopo Funcional ✅ **100%**

**Status:** Completo e documentado

**Documentação:**
- ✅ `docs/ESCOPO_E_ARQUITETURA_CMSP_CONNECT.md` - Escopo completo
- ✅ `docs/ESCOPO_CMSP_CONNECT.md` - Escopo resumido
- ✅ `docs/AI_ORCHESTRATOR_SPECIFICATION.md` - Especificação técnica
- ✅ `docs/DOCUMENTO_ARQUITETURA.md` - Arquitetura geral
- ✅ `src/pages/docs/PublicDocumentationPage.tsx` - Documentação pública

**MVP Definido:**
- ✅ Agente unificado com tool-calling
- ✅ 8 ferramentas especializadas
- ✅ Interface conversacional única
- ✅ CMS administrativo completo
- ✅ Motor de análise automatizado

**Roadmap Documentado:**
- ✅ Fase 1: MVP (Atual) - Completo
- ✅ Fase 2: Expansão - Documentado
- ✅ Fase 3: Evolução - Documentado

---

### 4. Mapeamento de Integrações ✅ **100%**

**Status:** Completo e documentado

**Integrações Mapeadas:**
- ✅ **Portal CMSP**: Notícias, agenda, audiências
  - Frequência: A cada 15min
  - Status: Mapeado e documentado
- ✅ **SP Legis**: Vereadores, comissões, projetos
  - Frequência: Diária
  - Status: Mapeado e documentado
- ✅ **Audiências**: Busca, inscrição, participação
  - Status: Implementado e funcional
- ✅ **APIs Municipais**: Serviços públicos geolocalizados
  - Status: Implementado (Google Maps Places API)
- ✅ **Knowledge Base**: Embeddings vetoriais para RAG
  - Status: Implementado

**Documentação:**
- ✅ `docs/DIAGRAMA_INTEGRACOES.md` - Diagramas completos
- ✅ `docs/ESCOPO_E_ARQUITETURA_CMSP_CONNECT.md` - Seção 14 (Fluxos de Integração)

**Implementações:**
- ✅ Páginas de audiências (`src/pages/audiencias/`)
- ✅ Páginas institucionais (`src/pages/institucional/`)
- ✅ Integração com Google Maps (`src/pages/NearbyServicesPage.tsx`)

---

### 5. Política de Privacidade ✅ **100%**

**Status:** Completo e funcional (implementado hoje)

**Implementações:**
- ✅ Página completa de Política de Privacidade (`/privacidade`)
- ✅ Conteúdo completo conforme LGPD
- ✅ Link no menu conectado e funcional
- ✅ Rota configurada no App.tsx
- ✅ Documentação de direitos do titular
- ✅ Política de retenção de dados
- ✅ Base legal para tratamento

**Arquivos:**
- `src/pages/PrivacyPolicyPage.tsx` - Página completa
- `src/components/MenuDrawer.tsx` - Link no menu
- `src/App.tsx` - Rota configurada

**Conteúdo:**
- ✅ 17 seções completas
- ✅ Conformidade com LGPD
- ✅ Direitos do titular documentados
- ✅ Política de retenção definida
- ✅ Base legal para cada tipo de dado

---

## 🟡 PARCIALMENTE IMPLEMENTADO

### 6. Consentimento de Dados 🟡 **70%**

**Status:** Estrutura criada, funcionalidades básicas implementadas

**✅ Implementado:**
- ✅ Tabela `user_consents` criada no banco
- ✅ Enum `consent_type` com 7 tipos:
  - `terms_of_use`
  - `privacy_policy`
  - `data_collection`
  - `location_tracking`
  - `demographic_data`
  - `newsletter`
  - `council_sharing`
- ✅ Funções RPC:
  - `grant_consent()` - Conceder consentimento
  - `revoke_consent()` - Revogar consentimento
  - `has_consent()` - Verificar consentimento
- ✅ Registro automático no cadastro (terms_of_use e privacy_policy)
- ✅ Aceite obrigatório no registro (checkboxes)
- ✅ RLS configurado (usuários veem apenas seus consentimentos)

**❌ Pendente:**
- ❌ Página de gestão de consentimentos no perfil
- ❌ Interface para revogar consentimentos
- ❌ Interface para conceder consentimentos adicionais
- ❌ Histórico de consentimentos (quando foi dado/revogado)
- ❌ Notificações quando consentimentos são necessários

**Arquivos:**
- ✅ `supabase/migrations/20260131000000_user_consents.sql` - Estrutura completa
- ✅ `src/pages/Register.tsx` - Aceite no cadastro
- ❌ `src/pages/profile/ConsentsPage.tsx` - **A criar**

**Próximos Passos:**
1. Criar página `/perfil/consentimentos`
2. Implementar interface de gestão
3. Adicionar notificações para consentimentos pendentes

---

### 7. Governança LGPD 🟡 **40%**

**Status:** Estrutura básica criada, funcionalidades avançadas pendentes

**✅ Implementado:**
- ✅ Política de privacidade completa
- ✅ Sistema de consentimentos (estrutura)
- ✅ RLS em todas as tabelas
- ✅ Criptografia de dados (Supabase nativo)
- ✅ Logs de auditoria (`audit_logs` table)
- ✅ Controle de acesso por perfil

**❌ Pendente:**
- ❌ **Exportação de dados pessoais (Portabilidade LGPD)**
  - Função para exportar todos os dados do usuário
  - Formato JSON/CSV legível
  - Interface no perfil
- ❌ **Anonimização automática**
  - Job para anonimizar dados após período de retenção
  - Agregação de dados de localização após 24h
  - Anonimização de dados demográficos após 90 dias
- ❌ **Gestão de direitos do titular**
  - Interface para solicitar exclusão de conta
  - Interface para correção de dados
  - Interface para oposição ao tratamento
  - Interface para revisão de decisões automatizadas
- ❌ **Registro de base legal**
  - Tabela para registrar base legal por dado
  - Rastreamento de finalidade do tratamento
- ❌ **DPO (Encarregado de Proteção de Dados)**
  - Canal de contato documentado
  - Interface para contato com DPO

**Arquivos Pendentes:**
- ❌ `src/pages/profile/DataExportPage.tsx` - Exportação de dados
- ❌ `src/pages/profile/DataRightsPage.tsx` - Direitos do titular
- ❌ `supabase/functions/anonymize-data/index.ts` - Função de anonimização
- ❌ `supabase/migrations/XXXXXX_data_retention_policies.sql` - Políticas de retenção

**Próximos Passos:**
1. Implementar exportação de dados (portabilidade)
2. Criar interface de direitos do titular
3. Implementar anonimização automática
4. Criar sistema de registro de base legal

---

## ❌ NÃO IMPLEMENTADO

### 8. Definição de Critérios de Aceite ❌ **0%**

**Status:** Não documentado formalmente

**O que falta:**
- ❌ Documento formal de critérios de aceite por feature
- ❌ Checklist de validação para cada funcionalidade
- ❌ Definição de "pronto" para cada item do roadmap
- ❌ Critérios de qualidade e performance
- ❌ Critérios de segurança e LGPD

**Sugestão de Estrutura:**
```
docs/CRITERIOS_ACEITE/
├── MVP.md
├── LGPD.md
├── Integracoes.md
├── Performance.md
└── Seguranca.md
```

**Próximos Passos:**
1. Criar template de critérios de aceite
2. Documentar critérios para cada feature do MVP
3. Definir critérios de qualidade
4. Criar checklist de validação

---

## 📈 Progresso Geral do Roadmap

```
Regras de negócio:           ████████████████████ 100%
Controle de acesso:          ████████████████████ 100%
Escopo funcional:            ████████████████████ 100%
Mapeamento integrações:      ████████████████████ 100%
Política de privacidade:     ████████████████████ 100%
Consentimento de dados:       ██████████████░░░░░░  70%
Governança LGPD:             ████████░░░░░░░░░░░░  40%
Critérios de aceite:         ░░░░░░░░░░░░░░░░░░░░   0%

PROGRESSO GERAL:             ████████████████░░░░  78%
```

---

## 🎯 Priorização para Completar o Roadmap

### Prioridade ALTA (Completar LGPD)

1. **Gestão de Consentimentos** (30% restante)
   - Página de gestão no perfil
   - Interface de revogação/concessão
   - Tempo estimado: 4-6 horas

2. **Exportação de Dados** (Portabilidade LGPD)
   - Função de exportação
   - Interface no perfil
   - Tempo estimado: 6-8 horas

3. **Direitos do Titular**
   - Interface para exclusão de conta
   - Interface para correção de dados
   - Tempo estimado: 4-6 horas

### Prioridade MÉDIA

4. **Anonimização Automática**
   - Jobs de anonimização
   - Agregação de dados
   - Tempo estimado: 8-10 horas

5. **Critérios de Aceite**
   - Documentação formal
   - Checklists de validação
   - Tempo estimado: 4-6 horas

### Prioridade BAIXA

6. **Registro de Base Legal**
   - Tabela de rastreamento
   - Interface administrativa
   - Tempo estimado: 6-8 horas

---

## 📋 Checklist de Implementação

### Consentimento de Dados (30% restante)
- [ ] Criar `src/pages/profile/ConsentsPage.tsx`
- [ ] Implementar lista de consentimentos
- [ ] Adicionar botões de revogar/conceder
- [ ] Mostrar histórico de mudanças
- [ ] Adicionar notificações para consentimentos pendentes
- [ ] Adicionar link no menu do perfil

### Governança LGPD (60% restante)
- [ ] Criar `src/pages/profile/DataExportPage.tsx`
- [ ] Implementar função de exportação (Edge Function ou RPC)
- [ ] Criar `src/pages/profile/DataRightsPage.tsx`
- [ ] Implementar solicitação de exclusão de conta
- [ ] Implementar solicitação de correção de dados
- [ ] Criar função de anonimização automática
- [ ] Configurar jobs de retenção de dados
- [ ] Criar interface de contato com DPO

### Critérios de Aceite (100% pendente)
- [ ] Criar estrutura de documentação
- [ ] Documentar critérios do MVP
- [ ] Documentar critérios de LGPD
- [ ] Documentar critérios de integrações
- [ ] Criar checklists de validação
- [ ] Definir critérios de performance
- [ ] Definir critérios de segurança

---

## 📊 Métricas de Conclusão

| Categoria | Itens | Implementados | Pendentes | % Completo |
|-----------|-------|---------------|-----------|------------|
| **Funcionalidades Core** | 4 | 4 | 0 | 100% |
| **LGPD Básico** | 2 | 2 | 0 | 100% |
| **LGPD Avançado** | 2 | 0.4 | 1.6 | 20% |
| **Documentação** | 1 | 0 | 1 | 0% |
| **TOTAL** | 9 | 6.4 | 2.6 | **71%** |

---

## 🚀 Próximas Ações Recomendadas

### Esta Semana
1. ✅ Completar gestão de consentimentos (interface no perfil)
2. ✅ Implementar exportação de dados (portabilidade)

### Próxima Semana
3. ✅ Implementar direitos do titular (exclusão, correção)
4. ✅ Documentar critérios de aceite

### Mês que Vem
5. ✅ Implementar anonimização automática
6. ✅ Sistema de registro de base legal

---

## 📝 Notas Finais

- **MVP está completo** - Todas as funcionalidades principais estão implementadas
- **LGPD básico está completo** - Política de privacidade e estrutura de consentimentos
- **LGPD avançado precisa de atenção** - Funcionalidades de portabilidade e direitos do titular
- **Documentação de critérios de aceite é importante** - Facilita validação e QA

**Tempo estimado para completar:** 30-40 horas de desenvolvimento
