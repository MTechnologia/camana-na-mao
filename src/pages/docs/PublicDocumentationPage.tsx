import { useNavigate } from 'react-router-dom';
import { DocumentViewer } from '@/components/docs/DocumentViewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogIn } from 'lucide-react';
import brasaoImage from '@/assets/brasao-sp.png';

const overviewContent = `
# CMSP Connect - Visão Executiva da Plataforma

## Sumário Executivo

O **CMSP Connect** é uma plataforma digital inovadora desenvolvida pela Câmara Municipal de São Paulo para revolucionar a comunicação entre cidadãos e o poder legislativo municipal. Utilizando inteligência artificial conversacional, a plataforma oferece uma experiência unificada para participação cidadã, avaliação de serviços públicos e acompanhamento legislativo.

---

## 1. Contexto e Visão

### 1.1 O Desafio

A Câmara Municipal de São Paulo enfrenta desafios significativos na comunicação com os cidadãos:

- **Fragmentação de canais**: Múltiplos pontos de contato desconectados
- **Baixo engajamento**: Participação cidadã limitada em audiências e consultas
- **Falta de visibilidade**: Cidadãos desconhecem o trabalho legislativo
- **Feedback disperso**: Dificuldade em consolidar manifestações e demandas

### 1.2 A Solução

O CMSP Connect oferece um **assistente virtual inteligente** que:

- Centraliza todas as interações em uma interface conversacional
- Guia cidadãos através de jornadas especializadas
- Coleta e estrutura feedback de forma automatizada
- Conecta demandas às comissões parlamentares apropriadas

---

## 2. Arquitetura do Sistema

### 2.1 Visão Geral

\`\`\`mermaid
graph TB
    subgraph "Camada de Apresentação"
        A[App Mobile/Web] --> B[Interface Conversacional]
        B --> C[Jornadas Especializadas]
    end
    
    subgraph "Camada de Serviços"
        D[API REST] --> E[Edge Functions]
        E --> F[IA Generativa]
        E --> G[Processamento N8N]
    end
    
    subgraph "Camada de Dados"
        H[(PostgreSQL)] --> I[Knowledge Base]
        H --> J[Manifestações]
        H --> K[Perfis de Usuário]
    end
    
    C --> D
    F --> H
    G --> H
\`\`\`

### 2.2 Stack Tecnológico

| Camada | Tecnologia | Propósito |
|--------|------------|-----------|
| Frontend | React + TypeScript | Interface responsiva |
| Estilização | Tailwind CSS | Design system consistente |
| Backend | Edge Functions | Lógica serverless |
| Banco de Dados | PostgreSQL | Persistência de dados |
| IA | Modelos Generativos | Processamento de linguagem natural |
| Automação | N8N | Workflows de integração |

---

## 3. Jornadas do Cidadão

O CMSP Connect oferece **5 jornadas especializadas** para atender diferentes necessidades:

### 3.1 Tudo Sobre a Câmara

**Propósito**: Educação legislativa e informações institucionais

- Funcionamento da Câmara Municipal
- Papel dos vereadores e comissões
- Processo legislativo explicado
- Notícias e agenda institucional

### 3.2 Fala Cidadão!

**Propósito**: Relatos urbanos e feedback sobre a Câmara

- Problemas de infraestrutura urbana
- Sugestões para o legislativo
- Elogios e reclamações
- Classificação automática por IA

### 3.3 Transporte

**Propósito**: Diagnóstico de problemas no transporte público

- Relatos sobre linhas de ônibus/metrô
- Detecção de padrões recorrentes
- Encaminhamento para comissões relevantes
- Acompanhamento de status

### 3.4 Serviços

**Propósito**: Descoberta de serviços públicos próximos

- UBS, escolas, CEUs, hospitais
- Geolocalização e filtros
- Rotas e informações de contato
- Avaliações de outros cidadãos

### 3.5 Avaliar

**Propósito**: Avaliação de serviços públicos visitados

- Avaliação por estrelas e comentários
- Análise de sentimento automatizada
- Sugestão de encaminhamento a vereadores
- Histórico de avaliações

---

## 4. Fluxo de Processamento

### 4.1 Ciclo de Vida de uma Manifestação

\`\`\`mermaid
sequenceDiagram
    participant C as Cidadão
    participant A as Assistente IA
    participant B as Backend
    participant N as N8N
    participant G as Gestor CMS
    
    C->>A: Inicia conversa
    A->>C: Coleta informações naturalmente
    A->>B: Salva manifestação estruturada
    B->>N: Envia para processamento
    N->>N: Valida, categoriza, prioriza
    N->>B: Retorna dados enriquecidos
    B->>G: Disponibiliza no CMS
    G->>C: Responde/Encaminha
\`\`\`

### 4.2 Integração N8N

O N8N processa automaticamente cada manifestação:

1. **Validação**: Verifica completude dos dados
2. **Categorização**: Classifica por tema e área
3. **Priorização**: Define urgência baseada em critérios
4. **Enriquecimento**: Adiciona contexto e tags
5. **Roteamento**: Sugere comissão parlamentar

---

## 5. Área Administrativa (CMS)

### 5.1 Módulos do CMS

O painel administrativo oferece gestão completa:

| Módulo | Funcionalidade |
|--------|----------------|
| **Dashboard** | KPIs e métricas em tempo real |
| **Manifestações** | Gestão unificada com Kanban |
| **Encaminhamentos** | Sistema de referral a comissões |
| **Análise de Sentimento** | Visualização de tendências |
| **Analytics** | Dashboards e relatórios avançados |
| **Usuários** | Gestão de perfis e permissões |
| **Logs de Auditoria** | Rastreabilidade de ações |

### 5.2 Gestão de Manifestações

\`\`\`mermaid
stateDiagram-v2
    [*] --> Pendente: Nova manifestação
    Pendente --> EmAnalise: Gestor abre
    EmAnalise --> Encaminhado: Envia para comissão
    EmAnalise --> Respondido: Resposta direta
    Encaminhado --> Resolvido: Comissão atua
    Respondido --> Resolvido: Cidadão satisfeito
    Resolvido --> [*]
\`\`\`

---

## 6. Integrações Externas

### 6.1 Fontes de Dados

| Sistema | Dados | Frequência |
|---------|-------|------------|
| SP Legis | Vereadores, comissões, projetos | Diária |
| Portal CMSP | Notícias, agenda, audiências | A cada 15min |
| APIs Municipais | Serviços públicos geolocalizados | Sob demanda |

### 6.2 Notificações

- **Push**: Atualizações de manifestações
- **Email**: Resumos e confirmações
- **In-app**: Alertas contextuais

---

## 7. Segurança e LGPD

### 7.1 Proteção de Dados

- **Criptografia**: Dados sensíveis em repouso e trânsito
- **Anonimização**: Dados demográficos agregados
- **Minimização**: Coleta apenas do necessário
- **Retenção**: Políticas de expiração definidas

### 7.2 Direitos do Cidadão

O sistema garante conformidade com a LGPD:

- Acesso aos próprios dados
- Correção de informações
- Exclusão sob solicitação
- Portabilidade de dados
- Revogação de consentimento

---

## 8. Métricas de Sucesso

### 8.1 Indicadores de Engajamento

| Métrica | Meta | Descrição |
|---------|------|-----------|
| Usuários ativos mensais | 50.000+ | Cidadãos usando a plataforma |
| Taxa de conclusão de jornadas | 70%+ | Fluxos completados com sucesso |
| NPS | 60+ | Satisfação do cidadão |
| Tempo médio de resposta | <48h | Agilidade no atendimento |

### 8.2 Indicadores Operacionais

| Métrica | Meta | Descrição |
|---------|------|-----------|
| Manifestações processadas/dia | 500+ | Volume de demandas |
| Taxa de categorização automática | 90%+ | Eficiência da IA |
| Encaminhamentos bem-sucedidos | 80%+ | Precisão do roteamento |

---

## 9. Roadmap

### Fase 1: MVP (Atual)
- ✅ Interface conversacional
- ✅ 5 jornadas especializadas
- ✅ CMS administrativo
- ✅ Integração N8N

### Fase 2: Expansão
- 🔄 App mobile nativo (Flutter)
- 🔄 Integração com sistemas legados
- 🔄 Analytics avançados com BI

### Fase 3: Evolução
- 📋 IA preditiva para demandas
- 📋 Assistente de voz
- 📋 Gamificação de participação

---

## 10. Glossário

| Termo | Definição |
|-------|-----------|
| **Manifestação** | Qualquer comunicação do cidadão (relato, avaliação, sugestão) |
| **Jornada** | Fluxo conversacional especializado para um propósito |
| **Comissão** | Grupo parlamentar temático que recebe encaminhamentos |
| **Encaminhamento** | Direcionamento de manifestação para comissão relevante |
| **Gestor** | Funcionário da CMSP que administra o sistema |

---

## Contato

**Câmara Municipal de São Paulo**
Viaduto Jacareí, 100 - Bela Vista
São Paulo - SP, 01319-900

📧 cmspconnect@saopaulo.sp.leg.br
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
                  <p className="text-xs text-muted-foreground">Documentação CMSP Connect</p>
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
              © {new Date().getFullYear()} CMSP Connect - Todos os direitos reservados
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicDocumentationPage;
