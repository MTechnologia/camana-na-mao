import { useNavigate } from 'react-router-dom';
import { DocumentViewer } from '@/components/docs/DocumentViewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogIn } from 'lucide-react';
import brasaoImage from '@/assets/brasao-sp.png';

const overviewContent = `
# Câmara na Mão - Visão Executiva da Plataforma

## Sumário Executivo

O **Câmara na Mão** é uma plataforma digital inovadora desenvolvida pela Câmara Municipal de São Paulo para revolucionar a comunicação entre cidadãos e o poder legislativo municipal. Utilizando um **assistente virtual inteligente com arquitetura de tool-calling**, a plataforma oferece uma experiência unificada para participação cidadã, avaliação de serviços públicos e acompanhamento legislativo.

> **Diferencial**: Um único agente conversacional que detecta automaticamente a intenção do cidadão e aciona a ferramenta apropriada, sem necessidade de navegação manual entre módulos.

---

## 1. Contexto e Visão

### 1.1 O Desafio

A Câmara Municipal de São Paulo enfrenta desafios significativos na comunicação com os cidadãos:

- **Fragmentação de canais**: Múltiplos pontos de contato desconectados
- **Baixo engajamento**: Participação cidadã limitada em audiências e consultas
- **Falta de visibilidade**: Cidadãos desconhecem o trabalho legislativo
- **Feedback disperso**: Dificuldade em consolidar manifestações e demandas

### 1.2 A Solução

O Câmara na Mão oferece um **assistente virtual unificado** que:

- Centraliza **todas** as interações em uma única interface conversacional
- **Detecta automaticamente a intenção** do cidadão via IA generativa
- Aciona **ferramentas especializadas** (tools) conforme a necessidade
- Coleta e estrutura feedback de forma automatizada
- Conecta demandas às comissões parlamentares apropriadas

---

## 2. Arquitetura do Sistema

### 2.1 Visão Geral - Agente Unificado

\`\`\`mermaid
graph TB
    subgraph "Interface Única"
        A[App Mobile/Web] --> B[AgentChatLayout]
        B --> C[Chat Conversacional]
        B --> D[ContextualFeed]
        B --> E[PromptChips]
    end
    
    subgraph "Agente Unificado - AI Orchestrator"
        F[AI Orchestrator] --> G{Detecção de Intenção}
        G --> H[Tool Calling]
    end
    
    subgraph "Ferramentas Especializadas"
        H --> I[create_urban_report]
        H --> J[create_transport_report]
        H --> K[create_service_rating]
        H --> L[search_knowledge_base]
        H --> M[find_nearby_services]
        H --> N[search_audiencias]
        H --> O[suggest_council_member]
        H --> P[get_citizen_history]
    end
    
    subgraph "Camada de Dados"
        Q[(PostgreSQL)] --> R[Knowledge Base]
        Q --> S[Manifestações]
        Q --> T[Perfis de Usuário]
    end
    
    C --> F
    I & J & K & L & M & N & O & P --> Q
\`\`\`

### 2.2 Stack Tecnológico

| Camada | Tecnologia | Propósito |
|--------|------------|-----------|
| Frontend | React + TypeScript | Interface responsiva |
| Estilização | Tailwind CSS | Design system consistente |
| Backend | Supabase Edge Functions | Lógica serverless |
| Banco de Dados | PostgreSQL | Persistência de dados |
| IA | Lovable AI Gateway (Gemini/GPT) | Processamento de linguagem natural com tool-calling |
| Automação | N8N | Workflows de integração externa |

### 2.3 Arquitetura de Tool-Calling

O **AI Orchestrator** é o cérebro do sistema. Ele recebe mensagens do cidadão e decide qual ferramenta acionar:

1. **Recebe mensagem** do cidadão via chat
2. **Analisa contexto** e histórico da conversa
3. **Detecta intenção** usando patterns pré-definidos + inferência do LLM
4. **Chama a tool apropriada** com parâmetros extraídos da conversa
5. **Retorna resposta estruturada** ao cidadão

\`\`\`mermaid
flowchart LR
    A[Mensagem do Cidadão] --> B{AI Orchestrator}
    B --> C[Detecta Intenção]
    C --> D[Extrai Parâmetros]
    D --> E[Chama Tool]
    E --> F[Executa Ação no Banco]
    F --> G[Formata Resposta]
    G --> H[Retorna ao Cidadão]
\`\`\`

---

## 3. Capacidades do Assistente

O assistente possui **8 ferramentas especializadas** que são acionadas automaticamente:

### 3.1 Ferramentas de Registro

| Tool | Descrição | Exemplos de Gatilho |
|------|-----------|---------------------|
| \`create_urban_report\` | Registra problemas urbanos (buracos, iluminação, lixo) | "Tem um buraco na Rua X", "Poste sem luz" |
| \`create_transport_report\` | Relata problemas de transporte público | "Ônibus 875A sempre atrasado", "Problema no metrô" |
| \`create_service_rating\` | Avalia serviços públicos visitados | "Quero avaliar a UBS", "Atendimento ruim na escola" |

### 3.2 Ferramentas de Busca

| Tool | Descrição | Exemplos de Gatilho |
|------|-----------|---------------------|
| \`search_knowledge_base\` | Consulta informações sobre a Câmara | "Como funciona a Câmara?", "O que faz um vereador?" |
| \`find_nearby_services\` | Localiza serviços públicos próximos | "UBS mais próxima", "Onde tem CEU perto?" |
| \`search_audiencias\` | Busca audiências públicas | "Próximas audiências sobre saúde", "Agenda da Câmara" |
| \`get_citizen_history\` | Recupera histórico do cidadão | "Meus relatos", "O que já reportei?" |

### 3.3 Ferramentas de Recomendação

| Tool | Descrição | Exemplos de Gatilho |
|------|-----------|---------------------|
| \`suggest_council_member\` | Sugere vereadores por tema | "Qual vereador cuida de transporte?", "Quem procurar sobre saúde?" |

---

## 4. Interface do Usuário

### 4.1 AgentChatLayout

O componente principal que renderiza a experiência de chat:

- **Header dinâmico** com nome do assistente e ações
- **Sidebar de conversas** (em desktop) para histórico
- **Área de chat centralizada** com streaming de respostas
- **Input de mensagem** com suporte a anexos

### 4.2 ContextualFeed

Carousel informativo que exibe:

- **Notícias recentes** da Câmara Municipal
- **Próximas audiências públicas** relevantes
- **Atualizações** baseadas nos interesses do cidadão
- Atualização automática a cada 15 minutos

### 4.3 PromptChips

Botões de ação rápida que iniciam conversas direcionadas:

| Chip | Ação |
|------|------|
| 🗣️ **Relatar problema** | Inicia fluxo de criação de manifestação |
| ❓ **Tirar dúvida** | Consulta à base de conhecimento |
| 📍 **Serviços próximos** | Busca geolocalizada |

---

## 5. Fluxo de Processamento

### 5.1 Ciclo de Vida de uma Manifestação

\`\`\`mermaid
sequenceDiagram
    participant C as Cidadão
    participant UI as AgentChatLayout
    participant O as AI Orchestrator
    participant T as Tools
    participant DB as PostgreSQL
    participant N as N8N
    participant G as Gestor CMS
    
    C->>UI: "Tem um buraco na rua X"
    UI->>O: POST /ai-orchestrator
    O->>O: Detecta intenção: urban_report
    O->>O: Extrai: category=buraco, location=rua X
    O->>T: create_urban_report(params)
    T->>DB: INSERT urban_reports
    T-->>O: {id: "abc123", status: "created"}
    O-->>UI: "Seu relato foi registrado! Protocolo: abc123"
    UI->>C: Exibe confirmação + card de sucesso
    DB->>N: Trigger: novo relato
    N->>N: Valida, categoriza, prioriza
    N->>DB: UPDATE com dados enriquecidos
    G->>DB: Consulta manifestações
    G->>C: Responde/Encaminha
\`\`\`

### 5.2 Detecção de Intenção

O sistema usa uma combinação de:

1. **Patterns pré-definidos** (regex e keywords)
2. **Inferência do LLM** para casos ambíguos
3. **Contexto da conversa** para refinamento

\`\`\`
Exemplo de Patterns:
- "buraco|cratera|asfalto" → create_urban_report (category: buraco)
- "ônibus|metro|trem|linha" → create_transport_report
- "avaliar|nota|estrela" → create_service_rating
- "próximo|perto|onde tem" → find_nearby_services
\`\`\`

### 5.3 Integração N8N

O N8N processa automaticamente cada manifestação após criação:

1. **Validação**: Verifica completude dos dados
2. **Categorização**: Classifica por tema e área
3. **Priorização**: Define urgência baseada em critérios
4. **Enriquecimento**: Adiciona contexto e tags
5. **Roteamento**: Sugere comissão parlamentar

---

## 6. Área Administrativa (CMS)

### 6.1 Módulos do CMS

O painel administrativo oferece gestão completa:

| Módulo | Funcionalidade |
|--------|----------------|
| **Dashboard** | KPIs e métricas em tempo real |
| **Manifestações** | Gestão unificada com Kanban (urbanos + transporte + avaliações) |
| **Encaminhamentos** | Sistema de referral a vereadores e comissões |
| **Análise de Sentimento** | Visualização de tendências e drivers |
| **Analytics** | Dashboards personalizáveis e exportação |
| **Usuários** | Gestão de perfis e permissões (RBAC) |
| **Logs de Auditoria** | Rastreabilidade completa de ações |

### 6.2 Gestão de Manifestações

\`\`\`mermaid
stateDiagram-v2
    [*] --> Pendente: Nova manifestação
    Pendente --> EmAnalise: Gestor abre
    EmAnalise --> Encaminhado: Envia para vereador
    EmAnalise --> Respondido: Resposta direta
    Encaminhado --> Resolvido: Vereador atua
    Respondido --> Resolvido: Cidadão satisfeito
    Resolvido --> [*]
\`\`\`

---

## 7. Integrações Externas

### 7.1 Fontes de Dados

| Sistema | Dados | Frequência |
|---------|-------|------------|
| SP Legis | Vereadores, comissões, projetos | Diária |
| Portal CMSP | Notícias, agenda, audiências | A cada 15min |
| APIs Municipais | Serviços públicos geolocalizados | Sob demanda |
| Knowledge Base | Embeddings vetoriais para RAG | Atualização contínua |

### 7.2 Notificações

- **Push**: Atualizações de manifestações
- **Email**: Resumos e confirmações
- **In-app**: Alertas contextuais

---

## 8. Segurança e LGPD

### 8.1 Proteção de Dados

- **Criptografia**: Dados sensíveis em repouso e trânsito
- **Anonimização**: Dados demográficos agregados após 90 dias
- **Minimização**: Coleta apenas do necessário
- **Retenção**: Políticas de expiração definidas
- **RLS**: Row Level Security em todas as tabelas

### 8.2 Direitos do Cidadão

O sistema garante conformidade com a LGPD:

- Acesso aos próprios dados
- Correção de informações
- Exclusão sob solicitação
- Portabilidade de dados
- Revogação de consentimento

---

## 9. Métricas de Sucesso

### 9.1 Indicadores de Engajamento

| Métrica | Meta | Descrição |
|---------|------|-----------|
| Usuários ativos mensais | 50.000+ | Cidadãos usando a plataforma |
| Taxa de conclusão de conversas | 80%+ | Interações que resultam em ação |
| NPS | 60+ | Satisfação do cidadão |
| Tempo médio de resposta | <48h | Agilidade no atendimento |

### 9.2 Indicadores Operacionais

| Métrica | Meta | Descrição |
|---------|------|-----------|
| Manifestações processadas/dia | 500+ | Volume de demandas |
| Taxa de detecção automática | 95%+ | Precisão do AI Orchestrator |
| Encaminhamentos bem-sucedidos | 80%+ | Precisão do roteamento |
| Tempo de resposta da IA | <3s | Performance do tool-calling |

---

## 10. Roadmap

### Fase 1: MVP (Atual) ✅

- ✅ **Agente unificado com tool-calling** (AI Orchestrator)
- ✅ Interface conversacional única (AgentChatLayout)
- ✅ 8 ferramentas especializadas implementadas
- ✅ ContextualFeed e PromptChips
- ✅ CMS administrativo completo
- ✅ Integração N8N

### Fase 2: Expansão 🔄

- 🔄 Sistema de notificações progressivo
- 🔄 App mobile nativo (Flutter)
- 🔄 Analytics avançados com BI
- 🔄 Integração com sistemas legados

### Fase 3: Evolução 📋

- 📋 IA preditiva para demandas
- 📋 Assistente de voz nativo
- 📋 Gamificação de participação
- 📋 Expansão para outros municípios

---

## 11. Glossário

| Termo | Definição |
|-------|-----------|
| **Tool-Calling** | Mecanismo pelo qual o LLM aciona funções específicas baseado na intenção detectada |
| **Agente Unificado** | Assistente único que centraliza todas as interações, sem módulos separados |
| **AI Orchestrator** | Edge Function central que processa todas as mensagens do chat |
| **ContextualFeed** | Componente que exibe notícias e audiências relevantes em carousel |
| **PromptChips** | Botões de ação rápida para iniciar conversas direcionadas |
| **Manifestação** | Qualquer comunicação do cidadão (relato urbano, transporte, avaliação) |
| **Encaminhamento** | Direcionamento de manifestação para vereador/comissão relevante |
| **Gestor** | Funcionário da CMSP que administra o sistema |
| **RLS** | Row Level Security - controle de acesso a nível de linha no banco |
| **RAG** | Retrieval-Augmented Generation - busca + geração de resposta |

---

## Contato

**Câmara Municipal de São Paulo**
Viaduto Jacareí, 100 - Bela Vista
São Paulo - SP, 01319-900

📧 camaranamao@saopaulo.sp.leg.br
🌐 www.saopaulo.sp.leg.br
`;

const PublicDocumentationPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header Institucional */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <img src={brasaoImage} alt="Brasão SP" className="h-10 w-auto" />
                <div className="hidden sm:block">
                  <h1 className="text-sm font-semibold text-foreground">CÂMARA MUNICIPAL DE SÃO PAULO</h1>
                  <p className="text-xs text-muted-foreground">Documentação Câmara na Mão</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/login')}
                className="gap-2"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Entrar</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DocumentViewer content={overviewContent} />
      </main>

      {/* Footer Institucional */}
      <footer className="border-t border-border bg-muted/30 mt-16 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={brasaoImage} alt="Brasão SP" className="h-8 w-auto opacity-70" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Câmara Municipal de São Paulo</p>
                <p>Viaduto Jacareí, 100 - Bela Vista, São Paulo - SP</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Câmara na Mão - Todos os direitos reservados
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicDocumentationPage;
