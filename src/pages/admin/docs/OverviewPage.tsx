import { DocumentViewer } from '@/components/docs/DocumentViewer';
import { FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

// Import the markdown file as raw text
const overviewContent = `# CMSP Connect - Visão Executiva

## 1. Contexto e Visão

O **CMSP Connect** é uma plataforma digital inovadora desenvolvida pela Câmara Municipal de São Paulo (CMSP) para revolucionar a comunicação entre o poder legislativo municipal e os cidadãos paulistanos.

### 1.1 Desafio Atual

A Câmara Municipal de São Paulo enfrenta desafios significativos na comunicação com seus cidadãos:

- **Fragmentação de Canais**: Múltiplos pontos de contato sem integração
- **Baixo Engajamento**: Participação cidadã limitada em audiências públicas
- **Feedback Disperso**: Dificuldade em consolidar e analisar manifestações
- **Barreiras de Acesso**: Linguagem técnica e processos complexos

### 1.2 Solução Proposta

O CMSP Connect oferece uma **interface conversacional unificada** powered by AI que:

1. **Centraliza** todos os canais de comunicação cidadã
2. **Simplifica** a interação através de linguagem natural
3. **Automatiza** a triagem e encaminhamento de manifestações
4. **Gera insights** através de análise de sentimento e padrões

---

## 2. Arquitetura do Sistema

### 2.1 Visão Geral

\`\`\`mermaid
graph TB
    subgraph "Camada Cliente"
        A[App Híbrido Mobile]
        B[Portal Web Cidadão]
        C[CMS Administrativo]
    end
    
    subgraph "Camada API"
        D[API Gateway]
        E[Edge Functions]
        F[Webhooks N8N]
    end
    
    subgraph "Camada Dados"
        G[(PostgreSQL)]
        H[Storage]
        I[Knowledge Base]
    end
    
    subgraph "Integrações"
        J[SP Legis API]
        K[Portal CMSP]
        L[N8N Workflows]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    E --> G
    E --> H
    E --> I
    E --> F
    F --> L
    L --> J
    L --> K
\`\`\`

### 2.2 Componentes Principais

| Componente | Tecnologia | Descrição |
|------------|------------|-----------|
| Frontend Cidadão | React + TypeScript | Interface conversacional com IA |
| CMS Admin | React + TypeScript | Painel de gestão e analytics |
| Backend | Node.js + Edge Functions | APIs serverless escaláveis |
| Banco de Dados | PostgreSQL | Dados estruturados com RLS |
| IA/ML | Lovable AI Gateway | Modelos GPT e Gemini |
| Automação | N8N | Workflows de processamento |

---

## 3. Jornadas do Cidadão

### 3.1 Jornada Geral: "Tudo Sobre a Câmara"

Responde perguntas gerais sobre a Câmara Municipal, vereadores, comissões, processos legislativos e funcionamento institucional.

### 3.2 Relatos Urbanos: "Fala Cidadão!"

\`\`\`mermaid
sequenceDiagram
    participant C as Cidadão
    participant AI as Assistente IA
    participant DB as Banco de Dados
    participant N8N as N8N Workflow
    participant CMS as Painel Admin
    
    C->>AI: Relata problema urbano
    AI->>AI: Coleta dados via conversa
    AI->>AI: Classifica categoria/severidade
    AI->>DB: Salva relato estruturado
    DB->>N8N: Trigger automático
    N8N->>N8N: Enriquece e prioriza
    N8N->>DB: Atualiza com dados N8N
    DB->>CMS: Aparece no Kanban
    CMS->>C: Notificação de status
\`\`\`

### 3.3 Diagnóstico de Transporte

Coleta relatos sobre transporte público (atrasos, lotação, acessibilidade) e identifica padrões recorrentes para encaminhamento às autoridades competentes.

### 3.4 Serviços Públicos Geolocalizados

Descobre UBS, escolas, CEUs e outros equipamentos públicos próximos ao cidadão, com rotas, horários e avaliações.

### 3.5 Avaliação de Serviços

Permite avaliar experiências em serviços públicos visitados, gerando dados para análise de qualidade e identificação de melhorias necessárias.

---

## 4. Área Administrativa (CMS)

### 4.1 Módulos do CMS

| Módulo | Funcionalidade |
|--------|----------------|
| Dashboard | KPIs e métricas em tempo real |
| Manifestações | Kanban unificado de todas as demandas |
| Encaminhamentos | Gestão de referrals para vereadores |
| Analytics | Relatórios e análise de tendências |
| Sentimento | Análise de sentimento das manifestações |
| Usuários | Gestão de usuários e permissões |
| Auditoria | Logs de todas as ações do sistema |

### 4.2 Fluxo de Trabalho

\`\`\`mermaid
stateDiagram-v2
    [*] --> Pendente: Nova manifestação
    Pendente --> EmAnalise: Gestor assume
    EmAnalise --> Encaminhado: Requer ação externa
    EmAnalise --> Resolvido: Solucionado internamente
    Encaminhado --> Resolvido: Confirmação de resolução
    Resolvido --> [*]
    
    note right of EmAnalise: N8N pode enriquecer
    note right of Encaminhado: Vereador notificado
\`\`\`

---

## 5. Integrações Externas

### 5.1 SP Legis API

- Dados de vereadores e mandatos
- Comissões permanentes e temporárias
- Projetos de lei e tramitações
- Votações e presenças

### 5.2 Portal CMSP

- Notícias e comunicados oficiais
- Agenda de eventos e audiências
- Transmissões ao vivo
- Documentos oficiais

### 5.3 N8N Workflows

\`\`\`mermaid
graph LR
    A[Manifestação Criada] --> B{Tipo?}
    B -->|Urbano| C[Validar Localização]
    B -->|Transporte| D[Verificar Linha SPTrans]
    B -->|Feedback| E[Análise Sentimento]
    C --> F[Categorizar Automaticamente]
    D --> F
    E --> F
    F --> G[Definir Prioridade]
    G --> H[Enriquecer Dados]
    H --> I[Callback para Sistema]
    I --> J[Atualizar Manifestação]
\`\`\`

---

## 6. Segurança e LGPD

### 6.1 Medidas de Proteção

- **Criptografia**: Dados em trânsito (TLS) e em repouso
- **RLS (Row Level Security)**: Isolamento de dados por usuário
- **Anonimização**: Dados demográficos agregados apenas
- **Auditoria**: Log completo de todas as operações

### 6.2 Direitos do Titular

| Direito LGPD | Implementação |
|--------------|---------------|
| Acesso | Exportação de dados pessoais |
| Retificação | Edição de perfil |
| Exclusão | Deleção de conta |
| Portabilidade | Export em formato padrão |

---

## 7. Métricas de Sucesso

### 7.1 Engajamento

- Taxa de conversão de visitantes em usuários ativos
- Tempo médio de sessão no aplicativo
- Número de manifestações por usuário

### 7.2 Operacional

- Tempo médio de primeira resposta
- Taxa de resolução no primeiro contato
- Backlog de manifestações pendentes

### 7.3 Impacto Social

- Diversidade demográfica dos participantes
- Cobertura geográfica (regiões representadas)
- Satisfação do cidadão (NPS)

---

## 8. Cronograma

| Fase | Período | Entregas |
|------|---------|----------|
| Diagnóstico | Out-Nov 2025 | Levantamento e arquitetura |
| Fundação | Dez 2025 | Stack técnico e data model |
| MVP | Jan-Mar 2026 | Chatbot + CMS básico |
| Integração | Abr-Jun 2026 | N8N + APIs externas |
| Lançamento | Jul 2026 | Publicação em produção |
| Suporte | Ago-Set 2026 | Monitoramento e ajustes |

---

## 9. Glossário

| Termo | Definição |
|-------|-----------|
| **Manifestação** | Qualquer comunicação do cidadão (relato, avaliação, feedback) |
| **Encaminhamento** | Direcionamento de manifestação para vereador ou comissão |
| **Jornada** | Fluxo conversacional especializado para um tipo de interação |
| **RLS** | Row Level Security - controle de acesso a nível de registro |
| **Edge Function** | Função serverless executada próxima ao usuário |

---

*Documento gerado automaticamente pelo CMSP Connect*
`;

export default function OverviewPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Visão Executiva da Plataforma</h1>
            <p className="text-sm text-muted-foreground">Documentação técnica e visão geral do CMSP Connect</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 lg:p-8">
        <DocumentViewer content={overviewContent} title="CMSP Connect - Visão Executiva" />
      </div>
    </div>
  );
}
