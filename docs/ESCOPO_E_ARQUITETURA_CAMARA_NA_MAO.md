# Câmara na Mão - Documento de Escopo e Arquitetura

**Versão:** 3.0  
**Data:** Janeiro 2025  
**Status:** Em Elaboração

---

## Sumário

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Objetivos Estratégicos](#2-objetivos-estratégicos)
3. [Arquitetura do Orquestrador IA](#3-arquitetura-do-orquestrador-ia)
4. [Stack Tecnológica](#4-stack-tecnológica)
5. [Arquitetura de Alto Nível](#5-arquitetura-de-alto-nível)
6. [Modelo de Dados Conceitual](#6-modelo-de-dados-conceitual)
7. [Especificação de Dados por Tipo de Manifestação](#7-especificação-de-dados-por-tipo-de-manifestação)
8. [Personas e Perfis de Usuário](#8-personas-e-perfis-de-usuário)
9. [Casos de Uso](#9-casos-de-uso)
10. [Mapa do Site](#10-mapa-do-site)
11. [Jornadas do Usuário](#11-jornadas-do-usuário)
12. [Requisitos Não-Funcionais](#12-requisitos-não-funcionais)
13. [Requisitos de Segurança e LGPD](#13-requisitos-de-segurança-e-lgpd)
14. [Regras de Negócio](#14-regras-de-negócio)
15. [Estados e Ciclos de Vida](#15-estados-e-ciclos-de-vida)
16. [Fluxos de Integração](#16-fluxos-de-integração)
17. [Cenários de Erro e Contingência](#17-cenários-de-erro-e-contingência)
18. [Protocolos e Formatos](#18-protocolos-e-formatos)
19. [Matriz de Rastreabilidade](#19-matriz-de-rastreabilidade)
20. [Premissas e Restrições](#20-premissas-e-restrições)
21. [Métricas de Sucesso (KPIs)](#21-métricas-de-sucesso-kpis)
22. [Glossário](#22-glossário)

---

## 1. Visão Geral do Projeto

### 1.1 Contexto

O **Câmara na Mão** é um aplicativo móvel inovador de participação cidadã que conecta os munícipes de São Paulo à Câmara Municipal, utilizando inteligência artificial para facilitar o acesso a informações legislativas, registro de demandas urbanas e avaliação de serviços públicos.

### 1.2 Propósito

Democratizar o acesso às informações e serviços da Câmara Municipal de São Paulo, promovendo transparência, participação ativa e aproximação entre cidadãos e poder legislativo.

### 1.3 Escopo do Produto

O aplicativo abrange:

- **Acolhimento Digital com IA**: Assistente virtual inteligente para orientação e registro de demandas
- **Manifestações Cidadãs**: Relatos urbanos, diagnóstico de transporte e avaliação de serviços
- **Audiências Públicas**: Consulta, inscrição e participação em audiências
- **Navegação Institucional**: Acesso a informações da Câmara, vereadores e agenda
- **Análises e Dashboards**: Visualização de dados agregados e insights
- **Mapa de Serviços**: Localização e informações de serviços públicos

### 1.4 Fora do Escopo

- Votação eletrônica em plenário
- Gestão interna de processos legislativos
- Tramitação de projetos de lei
- Folha de pagamento e RH da Câmara
- Sistemas de compras e licitações

---

## 2. Objetivos Estratégicos

### 2.1 Objetivos Primários

| ID | Objetivo | Indicador de Sucesso |
|----|----------|---------------------|
| OE1 | Aumentar a participação cidadã nas atividades legislativas | Crescimento nas interações cidadão-Câmara |
| OE2 | Melhorar a transparência e acesso à informação legislativa | Aumento no acesso a informações em linguagem simples |
| OE3 | Agilizar e simplificar o registro de demandas urbanas | Redução no tempo médio de registro de manifestações |
| OE4 | Facilitar a avaliação contínua de serviços públicos | Crescimento no volume de avaliações de serviços |

### 2.2 Objetivos Secundários

| ID | Objetivo | Indicador de Sucesso |
|----|----------|---------------------|
| OS1 | Identificar padrões recorrentes de problemas urbanos | Detecção automática de clusters e padrões |
| OS2 | Conectar cidadãos a vereadores por área de atuação | Aumento no match entre demandas e vereadores relevantes |
| OS3 | Promover educação cívica e conhecimento legislativo | Crescimento nos acessos ao módulo Câmara Explica |

---

## 3. Arquitetura do Orquestrador IA

### 3.1 Conceito Fundamental

O Câmara na Mão utiliza uma arquitetura de **Assistente Orquestrador Único** — um agente conversacional inteligente que atua como ponto central de interação entre o cidadão e todas as funcionalidades do sistema.

Diferentemente de sistemas com múltiplos chatbots especializados ou fluxos rígidos de formulários, o orquestrador:

- **Interpreta naturalmente** o que o cidadão deseja através de processamento de linguagem natural
- **Aciona ferramentas específicas** (tools) de forma transparente, sem que o usuário perceba a complexidade técnica
- **Coleta dados de forma conversacional**, solicitando uma informação por vez
- **Mantém o contexto** da conversa, permitindo interrupções e retomadas
- **Guia o cidadão** de forma empática e educativa

### 3.2 Componentes do Orquestrador

```
┌─────────────────────────────────────────────────────────────────┐
│                     ORQUESTRADOR IA                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │ Detector de      │───▶│ Gerenciador de   │                  │
│  │ Intenção         │    │ Contexto         │                  │
│  └──────────────────┘    └────────┬─────────┘                  │
│                                   │                             │
│                                   ▼                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ROTEADOR DE FERRAMENTAS                     │  │
│  └─────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────┘  │
│        │      │      │      │      │      │      │             │
│        ▼      ▼      ▼      ▼      ▼      ▼      ▼             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │Urban│ │Trans│ │Avali│ │Busca│ │Servi│ │Audi-│ │Verea│      │
│  │     │ │porte│ │ação │ │ RAG │ │ços  │ │ência│ │dores│      │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘      │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │ Motor de         │───▶│ Gerador de       │                  │
│  │ Validação        │    │ Respostas        │                  │
│  └──────────────────┘    └──────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.2.1 Detector de Intenção

Responsável por classificar o que o cidadão deseja fazer a partir de sua mensagem inicial ou contexto da conversa.

**Como funciona:**

1. Analisa a mensagem do cidadão usando modelo de linguagem (LLM)
2. Classifica a intenção em uma das categorias conhecidas
3. Extrai entidades relevantes já mencionadas (ex: categoria, localização)
4. Retorna um nível de confiança para a classificação

**Tipos de Intenção Reconhecidos:**

| Intenção | Gatilhos Comuns | Ferramenta Acionada |
|----------|-----------------|---------------------|
| Relato Urbano | "buraco na rua", "poste apagado", "lixo acumulado" | `create_urban_report` |
| Diagnóstico Transporte | "ônibus atrasado", "metrô lotado", "problema na linha" | `create_transport_report` |
| Avaliação de Serviço | "fui à UBS", "escola do meu filho", "atendimento no hospital" | `create_service_rating` |
| Dúvida Legislativa | "como funciona uma audiência?", "o que faz um vereador?" | `search_knowledge_base` |
| Busca de Serviços | "UBS perto de mim", "escola mais próxima" | `find_nearby_services` |
| Consulta Audiências | "próximas audiências", "audiência sobre saúde" | `search_audiencias` |
| Encaminhamento | "quero falar com vereador", "encaminhar meu relato" | `suggest_council_member` |

**Regra de Confiança:**
- Confiança ≥ 80%: Intenção é aceita automaticamente e fluxo inicia
- Confiança < 80%: Sistema pede confirmação ao cidadão antes de prosseguir

#### 3.2.2 Gerenciador de Contexto

Mantém o estado da conversa e coordena a coleta de dados.

**Responsabilidades:**
- Armazena dados já coletados na sessão
- Identifica campos faltantes para completar a ação
- Permite interrupção e retomada da conversa
- Recupera rascunhos salvos de sessões anteriores

**Estados Possíveis:**
- `idle`: Aguardando nova interação
- `detecting`: Identificando intenção do usuário
- `collecting`: Coletando dados para uma ação específica
- `confirming`: Aguardando confirmação do usuário
- `processing`: Executando a ação
- `completed`: Ação finalizada com sucesso

#### 3.2.3 Roteador de Ferramentas

Direciona a execução para a ferramenta adequada com base na intenção detectada.

**Ferramentas Disponíveis:**

| Ferramenta | Descrição | Dados que Coleta |
|------------|-----------|------------------|
| `create_urban_report` | Registra problemas urbanos | Categoria, localização, descrição, nível de risco, fotos |
| `create_transport_report` | Registra problemas de transporte | Tipo, linha, data, hora, descrição |
| `create_service_rating` | Registra avaliação de serviço | Serviço, estrelas, texto, sentimento |
| `search_knowledge_base` | Busca informações na base de conhecimento | Pergunta do usuário |
| `find_nearby_services` | Localiza serviços públicos | Tipo de serviço, localização atual |
| `search_audiencias` | Consulta audiências públicas | Tema, período, status |
| `suggest_council_member` | Sugere vereadores por relevância | Região, tema, tipo de demanda |
| `get_citizen_history` | Recupera histórico do cidadão | ID do usuário |

#### 3.2.4 Motor de Validação

Valida os dados coletados antes de persistir no banco.

**Validações Realizadas:**
- Campos obrigatórios preenchidos
- Tamanho mínimo de descrições (30 caracteres)
- Formato válido de CEP e endereço
- Consistência de datas (não futuras para ocorrências)
- Nível de risco coerente com categoria

#### 3.2.5 Gerador de Respostas

Produz respostas naturais e empáticas para o cidadão.

**Diretrizes de Comunicação:**
- Linguagem simples, nível 8ª série
- Tom empático e acolhedor
- Evita jargões técnicos e burocráticos
- Confirma entendimento antes de prosseguir
- Oferece ajuda contextual quando apropriado

### 3.3 Fluxo de Operação por Jornada

#### 3.3.1 Jornada: Relato Urbano

**Exemplo de Conversa:**

```
CIDADÃO: "Tem um buraco enorme na rua aqui perto da minha casa"

IA: [Detecta intenção: relato_urbano, categoria: via_publica, confiança: 92%]

IA: "Entendi, você quer reportar um problema na via pública. 
    Para eu registrar seu relato, preciso do endereço. 
    Qual é o CEP do local?"

CIDADÃO: "01310-100"

IA: [Valida CEP, faz geocodificação]

IA: "O CEP corresponde à região da Bela Vista. 
    Qual é o nome da rua e o número mais próximo do problema?"

CIDADÃO: "Rua Augusta, perto do 1500"

IA: [Registra endereço estruturado]

IA: "Perfeito. Agora me conta com mais detalhes: 
    como está esse buraco? É grande? Tem algum risco para pedestres ou veículos?"

CIDADÃO: "É um buraco grande, acho que uns 50cm, bem no meio da rua. 
         Já vi carro quase caindo dentro."

IA: [Extrai descrição >= 30 chars, detecta palavras de risco]

IA: "Parece uma situação séria. Para eu classificar a urgência corretamente:
    esse buraco oferece risco de acidente imediato?"

CIDADÃO: "Sim, principalmente à noite quando não dá pra ver direito"

IA: [Classifica risco como 'crítico']

IA: "Entendido. Como o risco é alto, preciso saber: 
    aproximadamente quantas pessoas ou veículos passam por esse trecho diariamente?"

CIDADÃO: "Muita gente, é uma rua movimentada"

IA: [Registra escopo_afetado: alto_fluxo]

IA: "Quer tirar uma foto do buraco agora para anexar ao relato? 
    Isso ajuda na análise."

CIDADÃO: "Não, prefiro não"

IA: [Foto opcional, pula]

IA: "Sem problemas! Seu relato foi registrado com sucesso! 
    
    📋 **Resumo do Relato**
    - **Protocolo:** URB-2025-000123
    - **Categoria:** Problema em via pública
    - **Local:** Rua Augusta, próximo ao 1500 - Bela Vista
    - **Descrição:** Buraco de aproximadamente 50cm no meio da rua
    - **Risco:** Crítico - risco de acidente
    
    Você receberá atualizações sobre o andamento.
    
    Gostaria de encaminhar este relato para um vereador da sua região?"
```

#### 3.3.2 Jornada: Diagnóstico de Transporte

**Exemplo de Conversa:**

```
CIDADÃO: "O ônibus 875A tá sempre atrasado de manhã"

IA: [Detecta intenção: diagnostico_transporte, tipo: atraso, linha: 875A]

IA: "Entendi que você está tendo problemas com atrasos na linha 875A.
    Para registrar esse diagnóstico, me conta: 
    quando foi a última vez que isso aconteceu?"

CIDADÃO: "Hoje de manhã mesmo"

IA: [Infere data: hoje, solicita confirmação]

IA: "Foi hoje então. Você lembra mais ou menos que horas era?"

CIDADÃO: "Umas 7h30"

IA: [Registra hora_ocorrencia: 07:30]

IA: "Perfeito. Me descreve melhor a situação: 
    o ônibus demorou quanto tempo além do normal?"

CIDADÃO: "Fiquei esperando mais de 40 minutos, sendo que deveria passar 
         a cada 15 minutos. E quando veio estava lotado."

IA: [Extrai descrição com detalhes, detecta problema secundário: lotação]

IA: "Registrei seu diagnóstico com sucesso!

    📋 **Resumo do Diagnóstico**
    - **Protocolo:** TRP-2025-000456
    - **Linha:** 875A
    - **Tipo de Problema:** Atraso excessivo
    - **Data/Hora:** Hoje, por volta das 7h30
    - **Detalhes:** Espera de 40 minutos para linha que deveria passar a cada 15
    
    Identificamos que outros cidadãos também reportaram problemas 
    nesta linha recentemente. Esse padrão será analisado.
    
    Quer encaminhar para um vereador acompanhar?"
```

#### 3.3.3 Jornada: Avaliação de Serviço

**Exemplo de Conversa:**

```
[Notificação push após visita detectada à UBS]

IA: "Olá! Vi que você esteve na UBS Bela Vista hoje. 
    Como foi sua experiência? Pode avaliar de 1 a 5 estrelas."

CIDADÃO: "3 estrelas"

IA: [Registra rating: 3]

IA: "Obrigada pelo feedback! Se quiser, pode me contar 
    o que poderia ter sido melhor."

CIDADÃO: "Demorei muito pra ser atendido, mais de 2 horas, 
         mas quando fui atendido a médica foi muito atenciosa"

IA: [Analisa sentimento: misto/neutro, extrai pontos positivos e negativos]

IA: "Entendi. Longo tempo de espera mas bom atendimento médico.
    Sua avaliação foi registrada!
    
    📋 **Resumo da Avaliação**
    - **Serviço:** UBS Bela Vista
    - **Nota:** ⭐⭐⭐ (3/5)
    - **Pontos:** Tempo de espera longo, atendimento médico bom
    
    Seu feedback ajuda a melhorar os serviços públicos.
    
    A nota foi abaixo de 4. Gostaria de encaminhar 
    esse feedback para um vereador?"
```

### 3.4 Detecção e Transição de Intenções

O orquestrador é capaz de detectar mudanças de intenção durante uma conversa e gerenciá-las de forma fluida.

**Cenário: Mudança de Intenção Durante Coleta**

```
CIDADÃO: "Quero reportar um problema na minha rua"

IA: [Inicia coleta de relato urbano]
IA: "Claro! Qual é o CEP do local?"

CIDADÃO: "Ah, antes disso, quando é a próxima audiência sobre transporte?"

IA: [Detecta nova intenção: consulta_audiencias]
IA: "Você quer saber sobre audiências de transporte.
    Posso responder isso rapidinho e depois voltamos ao seu relato.
    
    [Resultado da busca]
    Há uma audiência sobre mobilidade urbana dia 15/02.
    
    Agora, voltando ao seu relato: qual é o CEP do local do problema?"
```

**Regras de Transição:**
- **Consultas rápidas** (busca, informação): Responde e retoma jornada principal
- **Nova manifestação**: Pergunta se deseja abandonar a atual ou finalizá-la primeiro
- **Emergência detectada**: Interrompe e orienta para canais adequados (SAMU, Bombeiros)

### 3.5 Tratamento de Erros Conversacionais

**Quando o cidadão fornece informação incompleta ou ambígua:**

```
CIDADÃO: "O buraco é lá perto do mercado"

IA: "Entendi que há um ponto de referência (mercado), 
    mas preciso do endereço completo para localizar. 
    Você sabe o CEP ou o nome da rua?"
```

**Quando a classificação é ambígua:**

```
CIDADÃO: "O poste tá caído na calçada"

IA: [Detecta: poderia ser iluminação OU via_publica, confiança: 65%]

IA: "Entendi que há um problema com um poste. 
    Para eu classificar corretamente:
    - O poste está sem luz (problema de iluminação)?
    - Ou o poste caiu e está bloqueando a passagem (problema de via pública)?"
```

**Quando dados essenciais não podem ser obtidos:**

```
CIDADÃO: "Não sei o CEP e não sei o nome da rua"

IA: "Sem problemas! Você consegue me descrever algum ponto de referência 
    próximo? Por exemplo, um comércio, escola, ou praça conhecida?"

CIDADÃO: "É perto da praça da república"

IA: [Usa geocodificação reversa do ponto de referência]
IA: "A Praça da República fica no Centro. 
    Consegue me dizer de qual lado da praça é o problema?"
```

### 3.6 Integração com Sistema de Workflow

Após a coleta completa de dados, o orquestrador:

1. **Persiste** os dados no banco com status "pendente"
2. **Gera** um protocolo único (URB-YYYY-NNNNNN, TRP-YYYY-NNNNNN, AVA-YYYY-NNNNNN)
3. **Notifica** o motor de workflow via webhook
4. **Aguarda** callback com dados enriquecidos (prioridade, tags, categoria validada)
5. **Atualiza** o registro com dados processados
6. **Notifica** o cidadão sobre conclusão e protocolo

---

## 4. Stack Tecnológica

### 4.1 Visão Geral

A escolha da stack tecnológica segue critérios de custo-benefício, maturidade, comunidade ativa e adequação ao contexto de aplicativo governamental de grande escala.

### 4.2 Frontend Mobile

| Tecnologia | Escolha | Justificativa |
|------------|---------|---------------|
| **Framework** | React Native + TypeScript | Desenvolvimento cross-platform (iOS/Android) com código único, redução de custo de manutenção, comunidade ativa, reutilização de conhecimento React |
| **Navegação** | React Navigation | Biblioteca padrão para navegação em React Native, suporte a deep linking, gestos nativos |
| **Estado Global** | Zustand | Leve, simples, sem boilerplate excessivo, ótimo desempenho |
| **Requisições** | TanStack Query | Cache inteligente, gerenciamento de estados de loading/error, sincronização automática |
| **Mapas** | React Native Maps | Wrapper para MapKit (iOS) e Google Maps (Android), desempenho nativo |
| **Formulários** | React Hook Form + Zod | Validação tipada, performance otimizada, integração com TypeScript |

**Alternativa Considerada:**
- **Flutter**: Excelente desempenho e UI consistente, porém comunidade menor no Brasil e curva de aprendizado em Dart. React Native foi preferido pela familiaridade do mercado e ecossistema JavaScript/TypeScript.

### 4.3 Backend API

| Tecnologia | Escolha | Justificativa |
|------------|---------|---------------|
| **Framework** | NestJS (Node.js + TypeScript) | Arquitetura modular com dependency injection, ideal para APIs enterprise, compartilhamento de tipos com frontend |
| **ORM** | Prisma | Type-safe, migrações automáticas, excelente DX, geração automática de tipos |
| **Validação** | class-validator + class-transformer | Validação declarativa, integração nativa com NestJS |
| **Documentação** | Swagger/OpenAPI | Geração automática de documentação a partir de decorators |
| **Testes** | Jest + Supertest | Framework padrão, cobertura completa |

**Arquitetura de Módulos:**
```
src/
├── modules/
│   ├── auth/           # Autenticação e autorização
│   ├── users/          # Gestão de usuários e perfis
│   ├── reports/        # Manifestações (urbanas, transporte, avaliações)
│   ├── ai/             # Orquestrador e integrações de IA
│   ├── notifications/  # Push, email, SMS
│   ├── integrations/   # APIs externas (CMSP, SP Legis, Geo)
│   └── analytics/      # Dashboards e métricas
├── common/             # Utilitários compartilhados
└── config/             # Configurações de ambiente
```

### 4.4 Banco de Dados

| Tecnologia | Escolha | Justificativa |
|------------|---------|---------------|
| **SGBD Principal** | PostgreSQL 15+ | Relacional robusto, extensões para vetores e geo, RLS nativo, custo previsível em serviços gerenciados |
| **Serviço Gerenciado** | AWS RDS ou Google Cloud SQL | Alta disponibilidade, backups automáticos, failover |
| **Extensão Vetorial** | pgvector | Embeddings para busca semântica (RAG), sem necessidade de banco vetorial separado |
| **Extensão Geo** | PostGIS | Consultas geoespaciais nativas, índices espaciais |
| **Cache** | Redis (ElastiCache/Memorystore) | Cache de sessões, rate limiting, filas |

**Decisão Arquitetural: Modelo Normalizado**
O banco utiliza modelo estritamente relacional. Colunas JSONB são permitidas apenas para:
- Metadados de sistema (logs, configurações)
- Payloads brutos de integrações externas

Dados de negócio (conversas, mensagens, manifestações, endereços) utilizam tabelas relacionais explícitas para garantir integridade, consultas eficientes e relatórios analíticos.

### 4.5 Autenticação e Autorização

| Tecnologia | Escolha | Justificativa |
|------------|---------|---------------|
| **IdP** | Keycloak (self-hosted) ou AWS Cognito | OAuth2/OIDC completo, MFA nativo, social login, custo-benefício |
| **Tokens** | JWT com refresh rotation | Expiração curta (15min) com refresh (7 dias), revogação por blacklist |
| **Autorização** | RBAC + Row Level Security | Controle granular por papel e proprietário do dado |

**Comparativo de Opções:**

| Critério | Keycloak | AWS Cognito |
|----------|----------|-------------|
| Custo | Zero licença, custo de infra | Pay per MAU |
| Controle | Total (self-hosted) | Limitado ao oferecido |
| Operacional | Requer equipe de infra | Gerenciado |
| Customização | Alta | Média |
| **Recomendação** | Equipes com expertise DevOps | Menor overhead operacional |

### 4.6 Inteligência Artificial

| Tecnologia | Escolha | Justificativa |
|------------|---------|---------------|
| **LLM** | Google Vertex AI (Gemini) | Custo competitivo, contexto longo (1M tokens), hospedagem em região brasileira, multimodal |
| **Embeddings** | text-embedding-004 | Modelo Google otimizado para português |
| **RAG** | pgvector + PostgreSQL | Busca semântica sem banco vetorial separado, menor complexidade |

**Arquitetura RAG:**
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Documentos    │────▶│   Chunking +    │────▶│   PostgreSQL    │
│   CMSP (PDFs)   │     │   Embeddings    │     │   + pgvector    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Resposta      │◀────│   Gemini LLM    │◀────│   Chunks        │
│   ao Cidadão    │     │   (Geração)     │     │   Relevantes    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Guardrails de IA:**
- Respostas sobre legislação DEVEM citar fonte oficial
- Confiança < 70% gera aviso ao usuário
- Temas fora do escopo são recusados educadamente
- Logs de todas as interações para auditoria

### 4.7 Geolocalização e Mapas

| Tecnologia | Escolha | Justificativa |
|------------|---------|---------------|
| **Geocodificação** | Google Maps Platform | Melhor cobertura e precisão para endereços brasileiros, Places API |
| **Mapas no App** | Google Maps (Android) + MapKit (iOS) | Componentes nativos via React Native Maps |
| **Roteamento** | Directions API | Cálculo de rotas para navegação até serviços |

**Custos e Otimização:**
- $200/mês de créditos gratuitos do Google Maps
- Session tokens para autocomplete (reduz custos)
- Cache de geocodificações frequentes

### 4.8 Notificações

| Tecnologia | Escolha | Justificativa |
|------------|---------|---------------|
| **Push** | Firebase Cloud Messaging (FCM) + APNs | Gratuito para alto volume, confiabilidade |
| **Email** | Amazon SES ou SendGrid | Custo por envio baixo, templates HTML |
| **SMS** | Twilio ou AWS SNS | Fallback para notificações críticas |

### 4.9 Motor de Workflow

| Tecnologia | Escolha | Justificativa |
|------------|---------|---------------|
| **Engine** | N8N (self-hosted) | Requisito do cliente, interface visual low-code, zero custo de licença, webhooks nativos |

**Integração:**
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Backend API   │────▶│   N8N Webhook   │────▶│   Processamento │
│   (Manifestação)│     │   (Recebe)      │     │   (Workflow)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Atualiza BD   │◀────│   Callback API  │◀────│   Dados         │
│   (Enriquecido) │     │   (Retorna)     │     │   Processados   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 4.10 Observabilidade

| Tecnologia | Escolha | Justificativa |
|------------|---------|---------------|
| **Logs** | Grafana Loki | Open-source, integração com Grafana, query language similar a PromQL |
| **Métricas** | Prometheus + Grafana | Padrão de mercado, alertas configuráveis |
| **Tracing** | Jaeger | Distributed tracing para debug de requisições |
| **APM** | Sentry | Monitoramento de erros e performance no app mobile |
| **Instrumentação** | OpenTelemetry | Padrão aberto, vendor-neutral |

### 4.11 Infraestrutura

| Tecnologia | Escolha | Justificativa |
|------------|---------|---------------|
| **Container** | Docker | Padrão de mercado, consistência entre ambientes |
| **Orquestração** | Kubernetes (EKS ou GKE) ou ECS Fargate | Auto-scaling, self-healing, GitOps |
| **IaC** | Terraform | Multi-cloud, estado gerenciado, módulos reutilizáveis |
| **CI/CD** | GitHub Actions ou GitLab CI | Integração nativa com repositório, pipelines declarativos |
| **CDN** | CloudFront ou Cloud CDN | Cache de assets estáticos, edge locations no Brasil |

### 4.12 Armazenamento de Arquivos

| Tecnologia | Escolha | Justificativa |
|------------|---------|---------------|
| **Object Storage** | AWS S3 ou Google Cloud Storage | Custo por GB baixo, durabilidade, lifecycle policies |
| **CDN** | CloudFront/Cloud CDN | Distribuição de imagens anexadas a relatos |

---

## 5. Arquitetura de Alto Nível

### 5.1 Diagrama de Contexto

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CONTEXTO DO SISTEMA                                │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   CIDADÃO    │
                    │  (Munícipe)  │
                    └──────┬───────┘
                           │
                           │ Usa aplicativo móvel
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│                           CÂMARA NA MÃO                                         │
│                                                                                 │
│    Aplicativo móvel de participação cidadã com IA para conectar                │
│    munícipes à Câmara Municipal de São Paulo                                    │
│                                                                                 │
└───────────┬─────────────────┬─────────────────┬─────────────────┬──────────────┘
            │                 │                 │                 │
            ▼                 ▼                 ▼                 ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │  PORTAL CMSP  │ │  SP LEGIS     │ │  GOOGLE MAPS  │ │  FIREBASE     │
    │               │ │  API          │ │  PLATFORM     │ │  (FCM)        │
    │  Notícias,    │ │               │ │               │ │               │
    │  Agenda       │ │  Vereadores,  │ │  Geocoding,   │ │  Push         │
    │               │ │  Audiências   │ │  Mapas        │ │  Notifications│
    └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘

            │                                             │
            ▼                                             ▼
    ┌───────────────┐                             ┌───────────────┐
    │  N8N          │                             │  VERTEX AI    │
    │               │                             │  (Gemini)     │
    │  Motor de     │                             │               │
    │  Workflow     │                             │  LLM para     │
    │               │                             │  Orquestrador │
    └───────────────┘                             └───────────────┘

Outros Usuários:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  VEREADOR/   │  │  GESTOR      │  │  ADMIN       │  │  ASSESSOR    │
│  VEREADORA   │  │  PÚBLICO     │  │  DO SISTEMA  │  │  PARLAMENTAR │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

### 5.2 Diagrama de Containers

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ARQUITETURA DE CONTAINERS                             │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                EDGE / CDN                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  CloudFront / Cloud CDN                                                  │   │
│  │  - Assets estáticos (imagens, bundles)                                  │   │
│  │  - Cache de conteúdo                                                    │   │
│  │  - Edge locations Brasil                                                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PERÍMETRO DE SEGURANÇA                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  WAF (Web Application Firewall)                                         │   │
│  │  - Proteção DDoS                                                        │   │
│  │  - Rate Limiting                                                        │   │
│  │  - Bloqueio de IPs maliciosos                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CAMADA DE APLICAÇÃO                               │
│                                                                                 │
│  ┌─────────────────────┐     ┌─────────────────────┐                           │
│  │  APLICATIVO MÓVEL   │     │   API GATEWAY       │                           │
│  │  React Native       │────▶│   Kong / AWS API GW │                           │
│  │                     │     │                     │                           │
│  │  - iOS App Store    │     │  - Roteamento       │                           │
│  │  - Google Play      │     │  - Rate Limiting    │                           │
│  │                     │     │  - Autenticação     │                           │
│  └─────────────────────┘     └──────────┬──────────┘                           │
│                                         │                                       │
│                    ┌────────────────────┼────────────────────┐                 │
│                    │                    │                    │                 │
│                    ▼                    ▼                    ▼                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐    │
│  │  SERVIÇO API        │  │  SERVIÇO IA         │  │  SERVIÇO NOTIF      │    │
│  │  NestJS             │  │  (Orquestrador)     │  │  (Push/Email/SMS)   │    │
│  │                     │  │                     │  │                     │    │
│  │  - CRUD             │  │  - Detector Intent  │  │  - FCM              │    │
│  │  - Validação        │  │  - Tool Calling     │  │  - SES/SendGrid     │    │
│  │  - Regras Negócio   │  │  - RAG              │  │  - Twilio           │    │
│  └──────────┬──────────┘  └──────────┬──────────┘  └─────────────────────┘    │
│             │                        │                                         │
└─────────────┼────────────────────────┼─────────────────────────────────────────┘
              │                        │
              ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CAMADA DE DADOS                                    │
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐    │
│  │  POSTGRESQL 15+     │  │  REDIS              │  │  OBJECT STORAGE     │    │
│  │  (RDS/Cloud SQL)    │  │  (ElastiCache)      │  │  (S3/GCS)           │    │
│  │                     │  │                     │  │                     │    │
│  │  - Dados transac.   │  │  - Cache            │  │  - Fotos            │    │
│  │  - pgvector (RAG)   │  │  - Sessões          │  │  - Documentos       │    │
│  │  - PostGIS          │  │  - Rate limit       │  │  - Backups          │    │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              INTEGRAÇÕES EXTERNAS                              │
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐    │
│  │  KEYCLOAK / COGNITO │  │  N8N (Workflow)     │  │  VERTEX AI          │    │
│  │                     │  │                     │  │                     │    │
│  │  - OAuth2/OIDC      │  │  - Processamento    │  │  - Gemini LLM       │    │
│  │  - MFA              │  │  - Enriquecimento   │  │  - Embeddings       │    │
│  │  - Social Login     │  │  - Callbacks        │  │                     │    │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              OBSERVABILIDADE                                    │
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐    │
│  │  PROMETHEUS         │  │  GRAFANA LOKI       │  │  JAEGER             │    │
│  │  + GRAFANA          │  │                     │  │                     │    │
│  │                     │  │  - Logs centrais    │  │  - Distributed      │    │
│  │  - Métricas         │  │  - Queries          │  │    Tracing          │    │
│  │  - Alertas          │  │                     │  │                     │    │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘    │
│                                                                                 │
│  ┌─────────────────────┐                                                       │
│  │  SENTRY             │                                                       │
│  │                     │                                                       │
│  │  - Erros mobile     │                                                       │
│  │  - Performance      │                                                       │
│  └─────────────────────┘                                                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Diagrama de Infraestrutura

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         INFRAESTRUTURA CLOUD                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    VPC                                          │
│                                                                                 │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐       │
│  │        SUBNET PÚBLICA          │  │        SUBNET PRIVADA          │       │
│  │                                │  │                                │       │
│  │  ┌──────────────────────────┐ │  │  ┌──────────────────────────┐ │       │
│  │  │   Load Balancer (ALB)   │ │  │  │   Kubernetes Cluster      │ │       │
│  │  │   - HTTPS termination   │ │  │  │   (EKS / GKE)             │ │       │
│  │  │   - SSL certificates    │ │  │  │                          │ │       │
│  │  └──────────────────────────┘ │  │  │  ┌─────────┐ ┌─────────┐ │ │       │
│  │                                │  │  │  │ API Pod │ │ API Pod │ │ │       │
│  │  ┌──────────────────────────┐ │  │  │  └─────────┘ └─────────┘ │ │       │
│  │  │   NAT Gateway           │ │  │  │  ┌─────────┐ ┌─────────┐ │ │       │
│  │  │   - Saída para internet │ │  │  │  │ AI Pod  │ │ AI Pod  │ │ │       │
│  │  └──────────────────────────┘ │  │  │  └─────────┘ └─────────┘ │ │       │
│  │                                │  │  │  ┌─────────┐ ┌─────────┐ │ │       │
│  └────────────────────────────────┘  │  │  │Notif Pod│ │Cron Pod │ │ │       │
│                                       │  │  └─────────┘ └─────────┘ │ │       │
│                                       │  │                          │ │       │
│                                       │  └──────────────────────────┘ │       │
│                                       │                                │       │
│                                       │  ┌──────────────────────────┐ │       │
│                                       │  │   RDS PostgreSQL         │ │       │
│                                       │  │   - Multi-AZ             │ │       │
│                                       │  │   - Read Replicas        │ │       │
│                                       │  └──────────────────────────┘ │       │
│                                       │                                │       │
│                                       │  ┌──────────────────────────┐ │       │
│                                       │  │   ElastiCache Redis      │ │       │
│                                       │  │   - Cluster mode         │ │       │
│                                       │  └──────────────────────────┘ │       │
│                                       │                                │       │
│                                       └────────────────────────────────┘       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              JOBS AGENDADOS (CRONS)                            │
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐    │
│  │  SYNC NOTÍCIAS      │  │  SYNC AUDIÊNCIAS    │  │  SYNC VEREADORES    │    │
│  │  Cron: */15 * * * * │  │  Cron: 0 */2 * * *  │  │  Cron: 0 0 * * *    │    │
│  │                     │  │                     │  │                     │    │
│  │  - Busca Portal     │  │  - Busca SP Legis   │  │  - Busca SP Legis   │    │
│  │  - Atualiza cache   │  │  - Atualiza BD      │  │  - Atualiza BD      │    │
│  │  - Notifica users   │  │  - Envia lembretes  │  │  - Atualiza fotos   │    │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘    │
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐    │
│  │  CLEANUP LOGS       │  │  EXPIRAR VISITAS    │  │  GERAR EMBEDDINGS   │    │
│  │  Cron: 0 3 * * *    │  │  Cron: 0 * * * *    │  │  Cron: 0 4 * * *    │    │
│  │                     │  │                     │  │                     │    │
│  │  - Remove logs >90d │  │  - Marca expiradas  │  │  - Novos documentos │    │
│  │  - Compacta dados   │  │  - Envia notif      │  │  - Atualiza pgvector│    │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Fluxo de Dados Principal

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DE MANIFESTAÇÃO                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ CIDADÃO  │───▶│ APP      │───▶│ CDN/WAF  │───▶│ API GW   │───▶│ API SVC  │
│          │    │ Mobile   │    │          │    │          │    │ NestJS   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                                      │
        ┌─────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ ORQUESTRADOR │───▶│ VERTEX AI    │───▶│ POSTGRESQL   │
│ IA           │    │ (Gemini)     │    │ + pgvector   │
│              │◀───│              │◀───│              │
└──────┬───────┘    └──────────────┘    └──────────────┘
       │
       │ Após coleta completa
       ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ PERSISTÊNCIA │───▶│ N8N WEBHOOK  │───▶│ WORKFLOW     │
│ (status:     │    │ (assíncrono) │    │ PROCESSING   │
│  pendente)   │    │              │    │              │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
                                               │ Callback
                                               ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ NOTIFICAÇÃO  │◀───│ ATUALIZAÇÃO  │◀───│ DADOS        │
│ CIDADÃO      │    │ BD           │    │ ENRIQUECIDOS │
│ (protocolo)  │    │ (processado) │    │ (prioridade) │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 6. Modelo de Dados Conceitual

### 6.1 Diagrama Entidade-Relacionamento

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        MODELO DE DADOS CONCEITUAL                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│     USUARIO      │       │      PERFIL      │       │     ENDERECO     │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │1────1│ id (PK)          │       │ id (PK)          │
│ email (UK)       │       │ usuario_id (FK)  │       │ usuario_id (FK)  │
│ telefone         │       │ nome_completo    │       │ logradouro       │
│ criado_em        │       │ avatar_url       │       │ numero           │
│ atualizado_em    │       │ onboarding_at    │       │ complemento      │
└────────┬─────────┘       └──────────────────┘       │ bairro           │
         │                                             │ cep              │
         │1                                            │ cidade           │
         │                                             │ estado           │
         │                                             │ latitude         │
         ▼N                                            │ longitude        │
┌──────────────────┐                                   │ principal (bool) │
│   INTERESSE      │                                   └──────────────────┘
├──────────────────┤
│ id (PK)          │       ┌──────────────────┐       ┌──────────────────┐
│ usuario_id (FK)  │       │   PREFERENCIA    │       │   DEMOGRAFIA     │
│ categoria        │       ├──────────────────┤       ├──────────────────┤
│ criado_em        │       │ id (PK)          │       │ id (PK)          │
└──────────────────┘       │ usuario_id (FK)  │       │ usuario_id (FK)  │
                           │ push_enabled     │       │ data_nascimento  │
                           │ email_enabled    │       │ genero           │
                           │ sms_enabled      │       │ raca             │
                           │ horario_inicio   │       │ classe_social    │
                           │ horario_fim      │       └──────────────────┘
                           │ tema             │
                           └──────────────────┘

         │
         │1
         │
         ▼N
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              MANIFESTAÇÕES                                       │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  RELATO_URBANO   │       │RELATO_TRANSPORTE │       │AVALIACAO_SERVICO │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ usuario_id (FK)  │       │ usuario_id (FK)  │       │ usuario_id (FK)  │
│ protocolo (UK)   │       │ protocolo (UK)   │       │ protocolo (UK)   │
│ categoria        │       │ linha_id (FK)    │       │ servico_id (FK)  │
│ subcategoria     │       │ tipo_problema    │       │ visita_id (FK)   │
│ descricao        │       │ descricao        │       │ estrelas         │
│ nivel_risco      │       │ severidade       │       │ texto            │
│ escopo_afetado   │       │ data_ocorrencia  │       │ sentimento       │
│ status           │       │ hora_ocorrencia  │       │ anonima          │
│ severidade       │       │ status           │       │ criado_em        │
│ latitude         │       │ criado_em        │       └────────┬─────────┘
│ longitude        │       └────────┬─────────┘                │
│ endereco_completo│                │                          │
│ bairro           │                │                          │
│ cep              │                │                          │
│ referencia       │                │                          │
│ fotos[]          │                │                          │
│ criado_em        │                │                          │
└────────┬─────────┘                │                          │
         │                          │                          │
         │                          │                          │
         ▼                          ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              ENCAMINHAMENTO                                      │
├──────────────────────────────────────────────────────────────────────────────────┤
│ id (PK) | usuario_id (FK) | vereador_id (FK) | tipo_manifestacao               │
│ manifestacao_id | status | mensagem_cidadao | resposta | score_match           │
│ motivos_match[] | criado_em | atualizado_em                                     │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│                              ENTIDADES DE REFERÊNCIA                            │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ SERVICO_PUBLICO  │       │ LINHA_TRANSPORTE │       │    AUDIENCIA     │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ nome             │       │ codigo           │       │ titulo           │
│ tipo             │       │ nome             │       │ tema             │
│ endereco         │       │ tipo             │       │ descricao        │
│ bairro           │       │ regioes[]        │       │ data             │
│ latitude         │       │ criado_em        │       │ hora             │
│ longitude        │       └──────────────────┘       │ local            │
│ telefone         │                                   │ status           │
│ horario_func     │                                   │ link_transmissao │
│ media_avaliacoes │                                   │ vagas            │
│ total_avaliacoes │                                   │ inscricoes_abertas│
└──────────────────┘                                   └──────────────────┘

┌──────────────────┐       ┌──────────────────┐
│    VEREADOR      │       │    COMISSAO      │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │N────N│ id (PK)          │
│ nome             │       │ nome             │
│ partido          │       │ sigla            │
│ foto_url         │       │ descricao        │
│ email            │       │ temas[]          │
│ telefone         │       └──────────────────┘
│ areas_atuacao[]  │
│ regioes[]        │
└──────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│                              CONVERSAS IA                                        │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐
│   CONVERSA_IA    │       │    MENSAGEM      │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │1────N│ id (PK)          │
│ usuario_id (FK)  │       │ conversa_id (FK) │
│ titulo           │       │ role             │
│ contexto         │       │ content          │
│ status           │       │ tool_calls       │
│ criado_em        │       │ metadata         │
│ ultima_mensagem  │       │ criado_em        │
└──────────────────┘       └──────────────────┘
```

### 6.2 Descrição das Entidades Principais

#### 6.2.1 Entidades de Usuário

| Entidade | Descrição | Cardinalidade |
|----------|-----------|---------------|
| USUARIO | Conta principal do cidadão | 1 por pessoa |
| PERFIL | Dados pessoais e avatar | 1:1 com USUARIO |
| ENDERECO | Endereços do usuário | 1:N com USUARIO |
| INTERESSE | Temas de interesse | 1:N com USUARIO |
| PREFERENCIA | Configurações de notificação e privacidade | 1:1 com USUARIO |
| DEMOGRAFIA | Dados demográficos opcionais | 1:1 com USUARIO |

#### 6.2.2 Entidades de Manifestação

| Entidade | Descrição | Dados Obrigatórios |
|----------|-----------|-------------------|
| RELATO_URBANO | Problemas urbanos reportados | categoria, descrição, localização |
| RELATO_TRANSPORTE | Problemas de transporte | tipo, linha/código, data, descrição |
| AVALIACAO_SERVICO | Avaliação de serviço público | serviço, estrelas, visita |
| ENCAMINHAMENTO | Vínculo com vereador | vereador, manifestação |

#### 6.2.3 Entidades de Referência

| Entidade | Descrição | Fonte de Dados |
|----------|-----------|----------------|
| SERVICO_PUBLICO | Serviços como UBS, escolas | Integração CMSP + Crowdsourcing |
| LINHA_TRANSPORTE | Linhas de ônibus/metrô | SPTrans / Metrô |
| AUDIENCIA | Audiências públicas | Portal CMSP / SP Legis |
| VEREADOR | Representantes eleitos | SP Legis API |
| COMISSAO | Comissões parlamentares | SP Legis API |

---

## 7. Especificação de Dados por Tipo de Manifestação

Esta seção detalha os campos coletados para cada tipo de manifestação, suas regras de obrigatoriedade, validação e inferência.

### 7.1 Relato Urbano

#### 7.1.1 Campos e Obrigatoriedade

| Campo | Tipo | Obrigatório | Regra de Coleta |
|-------|------|-------------|-----------------|
| `categoria` | enum | ✅ Sim | Classificado pela IA com confirmação se confiança < 80% |
| `subcategoria` | string | ❌ Não | Inferido pela IA quando aplicável |
| `descricao` | text | ✅ Sim | Mínimo 30 caracteres, coletado via conversa |
| `cep` | string(9) | ✅ Sim | Coletado primeiro, valida formato XX.XXX-XXX ou XXXXX-XXX |
| `logradouro` | string | ✅ Sim | Pode vir de geocodificação do CEP ou entrada manual |
| `numero` | string | ⚠️ Condicional | Obrigatório se não houver ponto de referência |
| `bairro` | string | ✅ Sim | Inferido de geocodificação ou entrada manual |
| `ponto_referencia` | string | ⚠️ Condicional | Obrigatório se não houver número |
| `latitude` | decimal | ✅ Sim | GPS do dispositivo ou geocodificação |
| `longitude` | decimal | ✅ Sim | GPS do dispositivo ou geocodificação |
| `nivel_risco` | enum | ⚠️ Condicional | Obrigatório para categorias de risco (ver abaixo) |
| `escopo_afetado` | enum | ⚠️ Condicional | Obrigatório se nivel_risco = 'critico' ou 'moderado' |
| `estimativa_afetados` | enum | ❌ Não | Opcional, enriquece priorização |
| `consequencias_ativas` | array | ❌ Não | Opcional, seleção múltipla |
| `motivo_urgencia` | text | ❌ Não | Opcional, texto livre |
| `fotos` | array(url) | ❌ Não | Até 5 fotos, opcional |

#### 7.1.2 Categorias Válidas

| Categoria | Código | Exige Nível de Risco |
|-----------|--------|---------------------|
| Problema em via pública | `via_publica` | ✅ Sim |
| Iluminação | `iluminacao` | ✅ Sim |
| Saneamento/Esgoto | `esgoto` | ✅ Sim |
| Limpeza urbana | `limpeza_urbana` | ❌ Não |
| Áreas verdes | `area_verde` | ✅ Sim |
| Animais | `animais` | ❌ Não |
| Poluição | `poluicao` | ❌ Não |
| Higiene urbana | `higiene_urbana` | ❌ Não |
| Feedback para Câmara | `feedback_camara` | ❌ Não |

#### 7.1.3 Valores de Enums

**Nível de Risco (`nivel_risco`):**
- `baixo` - Inconveniente, sem risco imediato
- `moderado` - Risco potencial, requer atenção
- `critico` - Risco iminente de acidente ou dano

**Escopo Afetado (`escopo_afetado`):**
- `local` - Afeta apenas o ponto específico
- `rua` - Afeta a rua/quarteirão
- `bairro` - Afeta o bairro
- `regiao` - Afeta região da cidade

**Estimativa de Afetados (`estimativa_afetados`):**
- `poucos` - Menos de 10 pessoas/dia
- `dezenas` - Entre 10 e 100 pessoas/dia
- `centenas` - Entre 100 e 1000 pessoas/dia
- `milhares` - Mais de 1000 pessoas/dia

#### 7.1.4 Regras de Inferência

| Situação | Regra |
|----------|-------|
| Descrição contém palavras de risco ("acidente", "perigo", "caindo") | IA deve perguntar sobre nível de risco mesmo se categoria não exigir |
| CEP informado é válido | Logradouro e bairro são pré-preenchidos via geocodificação |
| Usuário não sabe CEP | IA solicita endereço completo ou ponto de referência |
| Categoria fora do escopo municipal | IA oferece registrar como feedback para Câmara |
| Fotos não enviadas | Relato é aceito sem fotos (opcional) |

#### 7.1.5 Exemplo de Coleta Estruturada

```
Dados Coletados:
{
  "categoria": "via_publica",
  "subcategoria": "buraco",
  "descricao": "Buraco de aproximadamente 50cm no meio da rua, risco de acidente",
  "cep": "01310-100",
  "logradouro": "Rua Augusta",
  "numero": null,
  "bairro": "Bela Vista",
  "ponto_referencia": "Próximo ao número 1500",
  "latitude": -23.5556,
  "longitude": -46.6622,
  "nivel_risco": "critico",
  "escopo_afetado": "rua",
  "estimativa_afetados": "milhares",
  "consequencias_ativas": ["transito_bloqueado", "risco_acidente"],
  "fotos": []
}
```

---

### 7.2 Relato de Transporte

#### 7.2.1 Campos e Obrigatoriedade

| Campo | Tipo | Obrigatório | Regra de Coleta |
|-------|------|-------------|-----------------|
| `tipo_problema` | enum | ✅ Sim | Inferido da descrição ou perguntado explicitamente |
| `linha_id` | uuid | ⚠️ Condicional | Obrigatório se for problema em linha específica |
| `linha_codigo_manual` | string | ⚠️ Condicional | Usado se linha não estiver cadastrada |
| `descricao` | text | ✅ Sim | Mínimo 20 caracteres |
| `data_ocorrencia` | date | ✅ Sim | Não pode ser futura, inferível de contexto |
| `hora_ocorrencia` | time | ❌ Não | Aproximada, ajuda na análise de padrões |
| `localizacao` | string | ❌ Não | Estação, ponto ou trecho |
| `impacto` | text | ❌ Não | Descrição do impacto sofrido |

#### 7.2.2 Tipos de Problema

| Tipo | Código | Descrição |
|------|--------|-----------|
| Atraso | `atraso` | Veículo atrasado além do normal |
| Lotação | `lotacao` | Veículo superlotado |
| Condição do veículo | `condicao_veiculo` | Problemas físicos (bancos, portas, ar) |
| Segurança | `seguranca` | Situações de insegurança, assédio |
| Informação | `informacao` | Falta de informação, painéis incorretos |
| Acessibilidade | `acessibilidade` | Problemas para PCD |
| Cancelamento | `cancelamento` | Linha/viagem cancelada |
| Outro | `outro` | Outros problemas |

#### 7.2.3 Regras de Inferência

| Situação | Regra |
|----------|-------|
| Usuário diz "hoje" | Data inferida como data atual |
| Usuário diz "ontem" | Data inferida como dia anterior |
| Usuário menciona "de manhã", "à noite" | Hora aproximada inferida (07:00, 20:00) |
| Descrição menciona "assédio", "medo" | Tipo inferido como `seguranca` |
| Linha não encontrada no cadastro | Permite entrada manual do código |

#### 7.2.4 Validação Importante

**Regra de "Não Chutar Data":**
A IA NÃO deve assumir automaticamente que o problema ocorreu "hoje". Se o usuário não informar explicitamente quando aconteceu, a IA DEVE perguntar: "Quando isso aconteceu?"

#### 7.2.5 Exemplo de Coleta Estruturada

```
Dados Coletados:
{
  "tipo_problema": "atraso",
  "linha_id": "uuid-da-linha-875a",
  "descricao": "Esperei mais de 40 minutos pelo ônibus que deveria passar a cada 15",
  "data_ocorrencia": "2025-01-15",
  "hora_ocorrencia": "07:30",
  "localizacao": "Ponto na Av. Paulista, próximo ao MASP",
  "impacto": "Cheguei atrasado no trabalho"
}
```

---

### 7.3 Avaliação de Serviço

#### 7.3.1 Campos e Obrigatoriedade

| Campo | Tipo | Obrigatório | Regra de Coleta |
|-------|------|-------------|-----------------|
| `servico_id` | uuid | ✅ Sim | Identificado automaticamente pela visita |
| `visita_id` | uuid | ✅ Sim | Gerado quando GPS detecta proximidade |
| `estrelas` | int(1-5) | ✅ Sim | Coletado explicitamente |
| `texto` | text | ❌ Não | Opcional, incentivado para notas baixas |
| `sentimento` | enum | ❌ Não | Inferido automaticamente da análise de texto |
| `anonima` | boolean | ❌ Não | Default: false, usuário pode optar |

#### 7.3.2 Tipos de Serviço

| Tipo | Código | Descrição |
|------|--------|-----------|
| UBS | `ubs` | Unidade Básica de Saúde |
| Escola | `school` | Escolas municipais |
| CEU | `ceu` | Centro Educacional Unificado |
| Hospital | `hospital` | Hospitais e prontos-socorros |
| Biblioteca | `library` | Bibliotecas públicas |
| Centro Esportivo | `sports_center` | Centros esportivos municipais |
| Outro | `other` | Outros serviços públicos |

#### 7.3.3 Valores de Sentimento (Inferido)

| Sentimento | Gatilhos |
|------------|----------|
| `positivo` | Elogios, satisfação, recomendação |
| `neutro` | Descrição factual, sem emoção clara |
| `negativo` | Reclamações, insatisfação, críticas |
| `misto` | Pontos positivos e negativos misturados |

#### 7.3.4 Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| Visita prévia obrigatória | Avaliação só pode ser solicitada após detecção de proximidade |
| Janela de 72 horas | Avaliação expira se não respondida em 72h |
| Uma por visita | Cidadão pode avaliar apenas uma vez por visita detectada |
| Nota ≤ 2 dispara encaminhamento | Oferecer encaminhamento para vereador |
| Análise de sentimento automática | Texto é analisado para detectar sentimento |

#### 7.3.5 Exemplo de Coleta Estruturada

```
Dados Coletados:
{
  "servico_id": "uuid-ubs-bela-vista",
  "visita_id": "uuid-visita-detectada",
  "estrelas": 3,
  "texto": "Demorei muito para ser atendido, mais de 2 horas, mas a médica foi muito atenciosa",
  "sentimento": "misto",
  "anonima": false
}
```

---

### 7.4 Feedback para Câmara

Caso especial de relato urbano para temas fora do escopo de problemas físicos da cidade.

#### 7.4.1 Campos e Obrigatoriedade

| Campo | Tipo | Obrigatório | Regra de Coleta |
|-------|------|-------------|-----------------|
| `subcategoria` | enum | ✅ Sim | Elogio, Reclamação ou Sugestão |
| `descricao` | text | ✅ Sim | Mínimo 30 caracteres |
| `vereador_mencionado` | string | ❌ Não | Nome do vereador se aplicável |
| `tema` | string | ❌ Não | Tema relacionado (saúde, educação, etc.) |

#### 7.4.2 Subcategorias

| Subcategoria | Código | Descrição |
|--------------|--------|-----------|
| Elogio | `elogio` | Reconhecimento positivo |
| Reclamação | `reclamacao` | Insatisfação com ação/omissão |
| Sugestão | `sugestao` | Proposta de melhoria |

#### 7.4.3 Quando Usar

- Cidadão menciona tema fora do escopo urbano (segurança pública, por exemplo)
- Cidadão quer elogiar ou criticar um vereador especificamente
- Cidadão tem sugestão legislativa

---

### 7.5 Regras Globais de Coleta

#### 7.5.1 Coleta Atômica

O orquestrador deve solicitar **uma informação por vez**, seguindo a ordem:

1. **Detectar intenção** e extrair dados já mencionados
2. **Classificar categoria** (para relatos urbanos)
3. **Coletar localização** (CEP primeiro, depois detalhes)
4. **Coletar descrição** (se não veio na mensagem inicial)
5. **Coletar dados condicionais** (risco, escopo, se aplicável)
6. **Oferecer opcionais** (fotos, encaminhamento)

#### 7.5.2 Gating Inteligente

Se a mensagem inicial do cidadão já contém uma descrição completa (≥ 30 caracteres), a IA deve:
- Extrair a descrição automaticamente
- Pular a pergunta "Descreva o problema"
- Prosseguir para o próximo campo faltante

#### 7.5.3 Descrição Mínima

Todas as manifestações exigem descrição com mínimo de caracteres para garantir qualidade:

| Tipo | Mínimo |
|------|--------|
| Relato Urbano | 30 caracteres |
| Relato Transporte | 20 caracteres |
| Avaliação (texto) | Sem mínimo (opcional) |

#### 7.5.4 Validação de Datas

| Regra | Aplicação |
|-------|-----------|
| Data não pode ser futura | Transporte: data_ocorrencia |
| Data máxima no passado: 90 dias | Transporte: data_ocorrencia |
| Inferência de "hoje" | APENAS se usuário disser explicitamente |

---

## 8. Personas e Perfis de Usuário

### 8.1 Personas Principais

#### Cidadão Comum
- **Descrição**: Morador de São Paulo que utiliza serviços públicos
- **Necessidades**: Reportar problemas, avaliar serviços, acompanhar demandas
- **Frequência de Uso**: Eventual (quando há necessidade)
- **Nível Técnico**: Básico

#### Cidadão Engajado
- **Descrição**: Morador ativo na participação cidadã
- **Necessidades**: Participar de audiências, acompanhar legislação, interagir com vereadores
- **Frequência de Uso**: Semanal
- **Nível Técnico**: Intermediário

#### Gestor Público
- **Descrição**: Servidor que analisa dados agregados
- **Necessidades**: Dashboards, relatórios, identificação de padrões
- **Frequência de Uso**: Diária
- **Nível Técnico**: Intermediário

#### Administrador
- **Descrição**: Responsável pela gestão do sistema
- **Necessidades**: Gerenciar usuários, configurar integrações, monitorar sistema
- **Frequência de Uso**: Diária
- **Nível Técnico**: Avançado

### 8.2 Matriz de Permissões (RBAC)

| Funcionalidade | Cidadão | Cidadão Engajado | Assessor | Vereador | Gestor | Admin |
|----------------|---------|------------------|----------|----------|--------|-------|
| Criar relatos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Avaliar serviços | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Inscrever em audiências | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver próprio histórico | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Encaminhar para vereador | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Responder encaminhamentos | ✗ | ✗ | ✓ | ✓ | ✗ | ✓ |
| Ver dashboards públicos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver dashboards completos | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| Exportar dados | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Gerenciar manifestações | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| Gerenciar usuários | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Configurar sistema | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Ver logs de auditoria | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |

---

## 9. Casos de Uso

### CSU001 - Acolhimento Digital Personalizado

**Ator Principal**: Cidadão  
**Ferramenta IA**: `get_citizen_history`

**Descrição**: O sistema recebe o cidadão de forma personalizada, considerando seu histórico, preferências e contexto atual (localização, horário).

**Fluxo Principal**:
1. Cidadão abre o aplicativo
2. Sistema identifica usuário autenticado
3. Sistema recupera contexto (histórico, pendências, interesses)
4. Sistema gera saudação personalizada com resumo relevante
5. Sistema apresenta ações prioritárias baseadas no contexto
6. Cidadão escolhe ação ou inicia conversa livre

**Fluxos Alternativos**:
- **FA1**: Primeiro acesso → Inicia onboarding
- **FA2**: Usuário não autenticado → Apresenta opções de login/cadastro
- **FA3**: Pendências urgentes → Destaca notificações prioritárias

**Pós-condições**: Cidadão está contextualizado e pronto para interagir

---

### CSU002 - Gestão de Audiências Públicas

**Ator Principal**: Cidadão  
**Ferramenta IA**: `search_audiencias`

**Descrição**: Permite consultar, filtrar e inscrever-se em audiências públicas da Câmara.

**Fluxo Principal**:
1. Cidadão solicita informações sobre audiências
2. Sistema apresenta audiências futuras filtradas por interesse
3. Cidadão seleciona audiência de interesse
4. Sistema exibe detalhes (tema, data, local, documentos)
5. Cidadão solicita inscrição
6. Sistema valida disponibilidade de vagas
7. Sistema confirma inscrição
8. Sistema agenda notificações de lembrete

**Fluxos Alternativos**:
- **FA1**: Sem vagas → Oferece lista de espera
- **FA2**: Audiência virtual → Fornece link de transmissão
- **FA3**: Conflito de horário → Alerta cidadão

**Pré-condições**: Cidadão autenticado  
**Pós-condições**: Inscrição registrada, lembretes agendados

---

### CSU003 - Navegação Institucional

**Ator Principal**: Cidadão  
**Ferramenta IA**: `search_knowledge_base`

**Descrição**: Acesso a informações institucionais da Câmara em linguagem acessível.

**Fluxo Principal**:
1. Cidadão faz pergunta sobre tema legislativo/institucional
2. Sistema busca na base de conhecimento (RAG)
3. Sistema encontra documentos relevantes
4. Sistema sintetiza resposta em linguagem simples
5. Sistema apresenta fontes oficiais utilizadas
6. Sistema oferece aprofundamento se necessário

**Fluxos Alternativos**:
- **FA1**: Tema não encontrado → Sugere reformulação ou contato
- **FA2**: Baixa confiança → Indica incerteza e sugere verificação
- **FA3**: Tema fora do escopo → Explica limitações e redireciona

**Regras de Negócio**:
- Respostas SEMPRE indicam fonte oficial
- Confiança < 70% gera aviso ao usuário
- Temas fora do escopo legislativo são educadamente recusados

---

### CSU004 - Avaliação de Serviços Públicos

**Ator Principal**: Cidadão  
**Ferramenta IA**: `create_service_rating`

**Descrição**: Avaliação geolocalizada de serviços públicos após visita detectada.

**Fluxo Principal**:
1. Sistema detecta proximidade de serviço público
2. Sistema registra visita potencial
3. Após período (2-24h), sistema solicita avaliação
4. Cidadão classifica experiência (1-5 estrelas)
5. Cidadão descreve experiência (opcional)
6. Sistema analisa sentimento do texto
7. Sistema persiste avaliação
8. Sistema atualiza média do serviço

**Fluxos Alternativos**:
- **FA1**: Avaliação negativa (≤2 estrelas) → Oferece encaminhamento a vereador
- **FA2**: Problema crítico identificado → Sugere relato urbano
- **FA3**: Cidadão não visitou → Permite pular avaliação

**Pré-condições**: Cidadão autenticado, permissão de localização  
**Pós-condições**: Avaliação registrada, métricas atualizadas

---

### CSU005 - Diagnóstico de Transporte Público

**Ator Principal**: Cidadão  
**Ferramenta IA**: `create_transport_report`

**Descrição**: Registro estruturado de problemas no transporte público.

**Fluxo Principal**:
1. Cidadão relata problema de transporte
2. Sistema identifica tipo de problema (atraso, lotação, condição, etc.)
3. Sistema solicita linha/código do veículo
4. Sistema valida linha no cadastro
5. Sistema solicita data/hora da ocorrência
6. Sistema coleta descrição detalhada
7. Sistema detecta padrões similares
8. Sistema persiste relato com protocolo
9. Sistema envia para processamento

**Fluxos Alternativos**:
- **FA1**: Linha não cadastrada → Permite informar código manualmente
- **FA2**: Padrão detectado → Informa cidadão sobre recorrência
- **FA3**: Problema crítico → Oferece encaminhamento prioritário

**Dados Obrigatórios**:
- Tipo de problema
- Linha ou código do veículo
- Data da ocorrência
- Descrição (mínimo 20 caracteres)

---

### CSU006 - Dashboard de Análises

**Ator Principal**: Gestor Público  
**Ferramenta IA**: N/A (consulta analítica)

**Descrição**: Visualização de dados agregados sobre manifestações, serviços e participação.

**Fluxo Principal**:
1. Gestor acessa área de analytics
2. Sistema apresenta KPIs principais
3. Gestor seleciona dimensão de análise (tempo, região, categoria)
4. Sistema renderiza visualizações interativas
5. Gestor aplica filtros e drill-down
6. Sistema atualiza visualizações em tempo real
7. Gestor exporta dados ou relatório

**Funcionalidades Analíticas**:
- **Drill-down**: Detalhar por subcategoria
- **Drill-up**: Agregar por categoria pai
- **Drill-across**: Cruzar dimensões
- **Drill-through**: Acessar registros individuais

---

### CSU007 - Mapa de Serviços Públicos

**Ator Principal**: Cidadão  
**Ferramenta IA**: `find_nearby_services`

**Descrição**: Localização e informações de serviços públicos próximos.

**Fluxo Principal**:
1. Cidadão solicita serviços próximos
2. Sistema obtém localização atual
3. Sistema busca serviços no raio configurado
4. Sistema apresenta mapa com marcadores
5. Cidadão seleciona serviço
6. Sistema exibe detalhes (horário, telefone, avaliações)
7. Cidadão solicita rota ou mais informações

**Fluxos Alternativos**:
- **FA1**: GPS indisponível → Solicita endereço manual
- **FA2**: Sem serviços no raio → Expande busca automaticamente
- **FA3**: Horário fechado → Destaca próximo horário disponível

**Tipos de Serviço**:
- UBS (Unidade Básica de Saúde)
- Escolas Municipais
- CEUs (Centro Educacional Unificado)
- Hospitais
- Bibliotecas
- Centros Esportivos

---

### CSU008 - Relatos Urbanos Estruturados

**Ator Principal**: Cidadão  
**Ferramenta IA**: `create_urban_report`, `suggest_council_member`

**Descrição**: Registro guiado de problemas urbanos com coleta estruturada de dados.

**Fluxo Principal**:
1. Cidadão descreve problema urbano
2. Sistema classifica categoria automaticamente
3. Sistema valida classificação com cidadão se confiança < 80%
4. Sistema coleta localização (CEP primeiro, depois detalhes)
5. Sistema solicita descrição detalhada (se não veio na mensagem inicial)
6. Sistema avalia nível de risco (para categorias aplicáveis)
7. Para riscos moderados/críticos, solicita escopo de afetados
8. Sistema permite anexar fotos (opcional)
9. Sistema gera protocolo
10. Sistema oferece encaminhamento a vereador
11. Sistema envia para processamento

**Categorias**:
- Via pública (buracos, calçadas)
- Iluminação (postes, lâmpadas)
- Saneamento (esgoto, drenagem)
- Limpeza urbana (lixo, entulho)
- Áreas verdes (poda, praças)
- Animais (infestações, animais mortos)
- Poluição (sonora, visual, atmosférica)

**Fluxos Alternativos**:
- **FA1**: Categoria fora do escopo municipal → Oferece registro como feedback
- **FA2**: Problema já relatado na região → Informa e permite reforçar
- **FA3**: Emergência → Orienta para canais apropriados (SAMU, Bombeiros)

---

## 10. Mapa do Site

```
Câmara na Mão
├── Onboarding
│   ├── Boas-vindas
│   ├── Cadastro/Login
│   └── Configuração inicial (interesses, localização)
│
├── Home (Acolhimento)
│   ├── Saudação personalizada
│   ├── Ações prioritárias
│   ├── Feed contextual
│   └── Acesso ao assistente IA
│
├── Assistente IA (Chat)
│   ├── Conversa principal
│   ├── Histórico de conversas
│   └── Rascunhos salvos
│
├── Manifestações
│   ├── Relatos Urbanos
│   │   ├── Novo relato
│   │   ├── Meus relatos
│   │   └── Detalhes do relato
│   ├── Transporte
│   │   ├── Novo diagnóstico
│   │   ├── Meus diagnósticos
│   │   └── Padrões identificados
│   └── Avaliações
│       ├── Pendentes
│       ├── Histórico
│       └── Serviços favoritos
│
├── Audiências Públicas
│   ├── Próximas
│   ├── Minhas inscrições
│   ├── Participação
│   └── Arquivo
│
├── Institucional
│   ├── Conheça a Câmara
│   ├── Vereadores
│   │   ├── Lista
│   │   └── Perfil do vereador
│   ├── Câmara Explica
│   ├── Notícias
│   ├── Agenda
│   └── Escola do Parlamento
│
├── Serviços Próximos
│   ├── Mapa
│   ├── Lista
│   ├── Detalhes do serviço
│   └── Favoritos
│
├── Minha Área
│   ├── Perfil
│   │   ├── Dados pessoais
│   │   ├── Endereços
│   │   ├── Interesses
│   │   └── Dados demográficos
│   ├── Preferências
│   │   ├── Notificações
│   │   ├── Privacidade
│   │   └── Acessibilidade
│   ├── Favoritos
│   └── Notificações
│
├── Analytics (Gestor/Admin)
│   ├── Dashboard principal
│   ├── Análise de sentimento
│   ├── Padrões de relatos
│   └── Exportações
│
└── Administração (Admin)
    ├── Gestão de manifestações
    ├── Gestão de usuários
    ├── Configurações do sistema
    ├── Integrações
    └── Logs de auditoria
```

---

## 11. Jornadas do Usuário

### 11.1 Jornada: Primeiro Acesso

#### Diagrama de Jornada

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         JORNADA: PRIMEIRO ACESSO                               │
└─────────────────────────────────────────────────────────────────────────────────┘

FASE 1: DESCOBERTA          FASE 2: ONBOARDING          FASE 3: PRIMEIRA INTERAÇÃO
─────────────────────       ─────────────────────       ──────────────────────────

   ┌──────────┐                ┌──────────┐                ┌──────────┐
   │ Encontra │                │ Tela de  │                │ Saudação │
   │ app na   │───────────────▶│ boas-    │───────────────▶│ persona- │
   │ loja     │                │ vindas   │                │ lizada   │
   └──────────┘                └──────────┘                └──────────┘
        │                           │                           │
        ▼                           ▼                           ▼
   ┌──────────┐                ┌──────────┐                ┌──────────┐
   │ Baixa e  │                │ Cadastro │                │ Explora  │
   │ instala  │                │ ou login │                │ funciona-│
   │          │                │          │                │ lidades  │
   └──────────┘                └──────────┘                └──────────┘
        │                           │                           │
        ▼                           ▼                           ▼
   ┌──────────┐                ┌──────────┐                ┌──────────┐
   │ Abre     │                │ Seleciona│                │ Primeira │
   │ pela     │                │ interesses│               │ ação     │
   │ 1ª vez   │                │          │                │ realizada│
   └──────────┘                └──────────┘                └──────────┘
                                    │
                                    ▼
                               ┌──────────┐
                               │ Informa  │
                               │ localiza-│
                               │ ção      │
                               └──────────┘
```

#### Descrição Detalhada

**Fase 1: Descoberta**

| Etapa | Ação do Usuário | Resposta do Sistema | Emoção |
|-------|-----------------|---------------------|--------|
| 1.1 | Busca "câmara municipal" na loja de apps | Exibe o app Câmara na Mão com descrição e avaliações | Curiosidade |
| 1.2 | Lê descrição e avaliações | Mostra funcionalidades principais e screenshots | Interesse |
| 1.3 | Clica em "Instalar" | Inicia download (~50MB) | Expectativa |
| 1.4 | Abre o app pela primeira vez | Exibe splash screen e carrega onboarding | Ansiedade leve |

**Fase 2: Onboarding**

| Etapa | Ação do Usuário | Resposta do Sistema | Emoção |
|-------|-----------------|---------------------|--------|
| 2.1 | Visualiza tela de boas-vindas | Apresenta propósito do app em 3 slides | Compreensão |
| 2.2 | Escolhe método de cadastro | Oferece email, telefone, Google, Apple | Familiaridade |
| 2.3 | Preenche dados básicos (nome, contato) | Valida dados em tempo real | Praticidade |
| 2.4 | Confirma email ou telefone | Envia código de verificação | Segurança |
| 2.5 | Seleciona interesses (mínimo 3) | Exibe categorias com ícones intuitivos | Personalização |
| 2.6 | Permite acesso à localização | Explica benefícios (serviços próximos) | Confiança |

**Fase 3: Primeira Interação**

| Etapa | Ação do Usuário | Resposta do Sistema | Emoção |
|-------|-----------------|---------------------|--------|
| 3.1 | Visualiza home personalizada | Saudação com nome e sugestões baseadas em interesses | Acolhimento |
| 3.2 | Explora opções disponíveis | Tutorial rápido destaca principais funcionalidades | Orientação |
| 3.3 | Realiza primeira ação (ex: consulta) | Confirma sucesso e incentiva próxima ação | Satisfação |

**Métricas de Sucesso da Jornada:**
- Taxa de conclusão do onboarding
- Tempo médio para primeira ação
- Taxa de permissão de localização
- Retenção D1 (volta no dia seguinte)

---

### 11.2 Jornada: Relato de Problema Urbano

#### Diagrama de Jornada

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     JORNADA: RELATO DE PROBLEMA URBANO                         │
└─────────────────────────────────────────────────────────────────────────────────┘

FASE 1: IDENTIFICAÇÃO       FASE 2: REGISTRO             FASE 3: CONCLUSÃO
─────────────────────       ─────────────────────        ──────────────────────

   ┌──────────┐                ┌──────────┐                ┌──────────┐
   │ Encontra │                │ Descreve │                │ Recebe   │
   │ problema │───────────────▶│ problema │───────────────▶│ protocolo│
   │ na rua   │                │ p/ IA    │                │          │
   └──────────┘                └──────────┘                └──────────┘
        │                           │                           │
        ▼                           ▼                           ▼
   ┌──────────┐                ┌──────────┐                ┌──────────┐
   │ Decide   │                │ IA       │                │ Vê       │
   │ reportar │                │ classifi-│                │ sugestão │
   │          │                │ ca       │                │ vereador │
   └──────────┘                └──────────┘                └──────────┘
        │                           │                           │
        ▼                           ▼                           ▼
   ┌──────────┐                ┌──────────┐                ┌──────────┐
   │ Abre     │                │ Confirma │                │ Decide   │
   │ app      │                │ localiza-│                │ encami-  │
   │          │                │ ção      │                │ nhar     │
   └──────────┘                └──────────┘                └──────────┘
        │                           │                           │
        ▼                           ▼                           ▼
   ┌──────────┐                ┌──────────┐                ┌──────────┐
   │ Inicia   │                │ Detalha  │                │ Recebe   │
   │ conversa │                │ descrição│                │ confirma-│
   │ com IA   │                │          │                │ ção      │
   └──────────┘                └──────────┘                └──────────┘
                                    │
                                    ▼
                               ┌──────────┐
                               │ Tira foto│
                               │ (opcional)│
                               └──────────┘
```

#### Descrição Detalhada

**Fase 1: Identificação do Problema**

| Etapa | Ação do Usuário | Resposta do Sistema | Emoção |
|-------|-----------------|---------------------|--------|
| 1.1 | Encontra buraco na rua do bairro | N/A (mundo real) | Frustração |
| 1.2 | Decide reportar o problema | N/A | Motivação |
| 1.3 | Abre o app Câmara na Mão | Carrega home com saudação | Esperança |
| 1.4 | Inicia conversa com assistente | IA saúda e pergunta como pode ajudar | Confiança |

**Fase 2: Registro do Relato**

| Etapa | Ação do Usuário | Resposta do Sistema | Emoção |
|-------|-----------------|---------------------|--------|
| 2.1 | Escreve: "Tem um buraco enorme na minha rua" | IA detecta intenção de relato urbano | Fluidez |
| 2.2 | Confirma categoria (via pública) | IA classifica automaticamente com 92% confiança | Praticidade |
| 2.3 | Informa CEP: "01310-100" | IA valida e retorna nome da rua e bairro | Precisão |
| 2.4 | Indica número aproximado | IA confirma localização completa | Segurança |
| 2.5 | Detalha: "Buraco de 50cm, risco de acidente" | IA extrai descrição e detecta palavras de risco | Atenção |
| 2.6 | Responde sobre risco iminente | IA classifica como risco crítico | Validação |
| 2.7 | Informa escopo (rua movimentada) | IA registra escopo de afetados | Importância |
| 2.8 | Opta por não tirar foto | IA aceita relato sem foto | Respeito |

**Fase 3: Conclusão**

| Etapa | Ação do Usuário | Resposta do Sistema | Emoção |
|-------|-----------------|---------------------|--------|
| 3.1 | Visualiza resumo do relato | Exibe protocolo URB-2025-000123 e dados coletados | Satisfação |
| 3.2 | Vê sugestão de vereador da região | Oferece encaminhamento com match de 87% | Oportunidade |
| 3.3 | Decide encaminhar | Registra encaminhamento e notifica assessoria | Empoderamento |
| 3.4 | Recebe confirmação final | Exibe protocolo final e próximos passos | Completude |

**Métricas de Sucesso da Jornada:**
- Tempo médio de registro (meta: < 3 minutos)
- Taxa de fotos anexadas
- Taxa de encaminhamento para vereador
- Satisfação com a experiência de registro

---

### 11.3 Jornada: Avaliação de Serviço Público

#### Diagrama de Jornada

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    JORNADA: AVALIAÇÃO DE SERVIÇO PÚBLICO                       │
└─────────────────────────────────────────────────────────────────────────────────┘

FASE 1: VISITA              FASE 2: SOLICITAÇÃO          FASE 3: AVALIAÇÃO
─────────────────────       ─────────────────────        ──────────────────────

   ┌──────────┐                ┌──────────┐                ┌──────────┐
   │ Cidadão  │                │ Recebe   │                │ Seleciona│
   │ vai à    │───────────────▶│ notifica-│───────────────▶│ estrelas │
   │ UBS      │                │ ção      │                │          │
   └──────────┘                └──────────┘                └──────────┘
        │                           │                           │
        ▼                           ▼                           ▼
   ┌──────────┐                ┌──────────┐                ┌──────────┐
   │ App      │                │ Abre     │                │ Escreve  │
   │ detecta  │                │ notifica-│                │ comentá- │
   │ proximi- │                │ ção      │                │ rio      │
   │ dade     │                │          │                │          │
   └──────────┘                └──────────┘                └──────────┘
        │                           │                           │
        ▼                           ▼                           ▼
   ┌──────────┐                ┌──────────┐                ┌──────────┐
   │ Registra │                │ Vê per-  │                │ Envia    │
   │ visita   │                │ gunta    │                │ avalia-  │
   │ silencio-│                │ sobre    │                │ ção      │
   │ samente  │                │ experiên-│                │          │
   └──────────┘                │ cia      │                └──────────┘
                               └──────────┘                      │
                                                                 ▼
                                                            ┌──────────┐
                                                            │ Vê agra- │
                                                            │ decimento│
                                                            └──────────┘
                                                                 │
                                                                 ▼
                                                            ┌──────────┐
                                                            │ Oferta   │
                                                            │ encami-  │
                                                            │ nhamento │
                                                            │ (se nota │
                                                            │ baixa)   │
                                                            └──────────┘
```

#### Descrição Detalhada

**Fase 1: Visita ao Serviço**

| Etapa | Ação do Usuário | Resposta do Sistema | Emoção |
|-------|-----------------|---------------------|--------|
| 1.1 | Vai à UBS para consulta | N/A (mundo real) | Necessidade |
| 1.2 | Permanece na UBS por tempo significativo | App detecta proximidade via GPS | Invisível |
| 1.3 | N/A | Sistema registra visita potencial silenciosamente | Invisível |

**Fase 2: Solicitação de Avaliação**

| Etapa | Ação do Usuário | Resposta do Sistema | Emoção |
|-------|-----------------|---------------------|--------|
| 2.1 | Recebe push notification horas depois | "Como foi sua visita à UBS Bela Vista?" | Lembrança |
| 2.2 | Abre a notificação | Exibe interface de avaliação amigável | Facilidade |
| 2.3 | Visualiza pergunta | Mostra escala de 1-5 estrelas com emojis | Clareza |

**Fase 3: Registro da Avaliação**

| Etapa | Ação do Usuário | Resposta do Sistema | Emoção |
|-------|-----------------|---------------------|--------|
| 3.1 | Seleciona 3 estrelas | Registra nota e pergunta se quer comentar | Expressão |
| 3.2 | Escreve comentário sobre espera longa | IA analisa sentimento (misto) | Desabafo |
| 3.3 | Envia avaliação | Confirma recebimento e agradece | Contribuição |
| 3.4 | Vê mensagem de nota abaixo de 4 | Oferece encaminhamento para vereador | Oportunidade |
| 3.5 | Decide encaminhar ou não | Registra decisão | Escolha |

**Métricas de Sucesso da Jornada:**
- Taxa de resposta às notificações
- Tempo entre notificação e avaliação
- Taxa de comentários escritos
- Taxa de encaminhamento após nota baixa

---

### 11.4 Jornada: Participação em Audiência Pública

#### Diagrama de Jornada

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                  JORNADA: PARTICIPAÇÃO EM AUDIÊNCIA PÚBLICA                    │
└─────────────────────────────────────────────────────────────────────────────────┘

FASE 1: DESCOBERTA          FASE 2: INSCRIÇÃO            FASE 3: PARTICIPAÇÃO
─────────────────────       ─────────────────────        ──────────────────────

   ┌──────────┐                ┌──────────┐                ┌──────────┐
   │ Recebe   │                │ Lê des-  │                │ Recebe   │
   │ notifica-│───────────────▶│ crição e │───────────────▶│ lembrete │
   │ ção de   │                │ documen- │                │ no dia   │
   │ audiência│                │ tos      │                │          │
   └──────────┘                └──────────┘                └──────────┘
        │                           │                           │
        ▼                           ▼                           ▼
   ┌──────────┐                ┌──────────┐                ┌──────────┐
   │ Vê tema  │                │ Solicita │                │ Acessa   │
   │ de inter-│                │ inscrição│                │ link ou  │
   │ esse     │                │          │                │ vai ao   │
   └──────────┘                └──────────┘                │ local    │
        │                           │                      └──────────┘
        ▼                           ▼                           │
   ┌──────────┐                ┌──────────┐                     ▼
   │ Acessa   │                │ Recebe   │                ┌──────────┐
   │ detalhes │                │ confirma-│                │ Participa│
   │          │                │ ção      │                │ da audi- │
   └──────────┘                └──────────┘                │ ência    │
                                    │                      └──────────┘
                                    ▼                           │
                               ┌──────────┐                     ▼
                               │ Adiciona │                ┌──────────┐
                               │ ao calen-│                │ Recebe   │
                               │ dário    │                │ resumo   │
                               └──────────┘                │ pós-     │
                                                           │ evento   │
                                                           └──────────┘
```

#### Descrição Detalhada

**Fase 1: Descoberta**

| Etapa | Ação do Usuário | Resposta do Sistema | Emoção |
|-------|-----------------|---------------------|--------|
| 1.1 | Recebe notificação sobre audiência | Push com tema alinhado aos interesses | Interesse |
| 1.2 | Visualiza tema (ex: mobilidade urbana) | Exibe resumo e data | Relevância |
| 1.3 | Acessa detalhes da audiência | Mostra descrição, local, horário, vagas | Informação |

**Fase 2: Inscrição**

| Etapa | Ação do Usuário | Resposta do Sistema | Emoção |
|-------|-----------------|---------------------|--------|
| 2.1 | Lê descrição e documentos relacionados | Exibe PDFs e links de contexto | Preparação |
| 2.2 | Solicita inscrição | Verifica vagas disponíveis | Expectativa |
| 2.3 | Confirma dados para inscrição | Registra inscrição e reserva vaga | Segurança |
| 2.4 | Recebe confirmação | Email/push com detalhes e código | Confirmação |
| 2.5 | Adiciona ao calendário | Integração com calendário do dispositivo | Organização |

**Fase 3: Participação**

| Etapa | Ação do Usuário | Resposta do Sistema | Emoção |
|-------|-----------------|---------------------|--------|
| 3.1 | Recebe lembretes (24h, 2h, 15min antes) | Notificações progressivas | Preparação |
| 3.2 | Acessa link (virtual) ou vai ao local | Fornece link de transmissão ou mapa | Acesso |
| 3.3 | Participa da audiência | N/A (evento externo) | Engajamento |
| 3.4 | Recebe resumo pós-evento | Email com ata, gravação e próximos passos | Continuidade |

**Métricas de Sucesso da Jornada:**
- Taxa de inscrição após visualização
- Taxa de comparecimento (presencial ou virtual)
- Engajamento pós-evento (downloads de documentos)

---

## 12. Requisitos Não-Funcionais

### 12.1 Desempenho

| Requisito | Especificação | Prioridade |
|-----------|--------------|------------|
| RNF-PERF-01 | Tempo de resposta P95 adequado para APIs | Alta |
| RNF-PERF-02 | Tempo de resposta P99 adequado para APIs | Alta |
| RNF-PERF-03 | Tempo de carregamento inicial do app otimizado | Alta |
| RNF-PERF-04 | Resposta do assistente IA em tempo aceitável | Média |
| RNF-PERF-05 | Renderização de mapas otimizada | Média |
| RNF-PERF-06 | Throughput adequado para demanda esperada | Alta |

### 12.2 Disponibilidade e Confiabilidade

| Requisito | Especificação | Prioridade |
|-----------|--------------|------------|
| RNF-DISP-01 | Alta disponibilidade do sistema | Alta |
| RNF-DISP-02 | RPO (Recovery Point Objective) adequado | Alta |
| RNF-DISP-03 | RTO (Recovery Time Objective) adequado | Alta |
| RNF-DISP-04 | Taxa de erro minimizada | Alta |
| RNF-DISP-05 | Failover automático para componentes críticos | Média |

### 12.3 Escalabilidade

| Requisito | Especificação | Prioridade |
|-----------|--------------|------------|
| RNF-ESC-01 | Suportar crescimento de base de usuários | Alta |
| RNF-ESC-02 | Escalar horizontalmente sob demanda | Alta |
| RNF-ESC-03 | Crescimento de dados planejado | Média |
| RNF-ESC-04 | Auto-scaling baseado em métricas | Média |

### 12.4 Segurança

| Requisito | Especificação | Prioridade |
|-----------|--------------|------------|
| RNF-SEG-01 | Autenticação via OAuth2/OIDC | Alta |
| RNF-SEG-02 | Tokens JWT com expiração curta e refresh | Alta |
| RNF-SEG-03 | Comunicação via TLS 1.3 | Alta |
| RNF-SEG-04 | Criptografia de dados em repouso (AES-256) | Alta |
| RNF-SEG-05 | Hash de senhas com Argon2id | Alta |
| RNF-SEG-06 | Rate limiting por IP e usuário | Alta |
| RNF-SEG-07 | Logs de auditoria para ações sensíveis | Alta |
| RNF-SEG-08 | Controle de acesso baseado em papéis (RBAC) | Alta |

### 12.5 Usabilidade e Acessibilidade

| Requisito | Especificação | Prioridade |
|-----------|--------------|------------|
| RNF-USA-01 | Conformidade WCAG 2.1 nível AA | Alta |
| RNF-USA-02 | Navegação completa por teclado/gestos | Alta |
| RNF-USA-03 | Ajuste de tamanho de fonte (3 níveis) | Alta |
| RNF-USA-04 | Compatibilidade com leitores de tela | Alta |
| RNF-USA-05 | Contraste mínimo adequado para texto | Alta |
| RNF-USA-06 | Linguagem simples (nível 8ª série) | Média |
| RNF-USA-07 | Suporte a modo escuro | Média |
| RNF-USA-08 | Modo leitura com espaçamento aumentado | Baixa |

### 12.6 Compatibilidade

| Requisito | Especificação | Prioridade |
|-----------|--------------|------------|
| RNF-COMP-01 | iOS 14+ e Android 10+ | Alta |
| RNF-COMP-02 | Funcionamento em redes 3G/4G/5G/WiFi | Alta |
| RNF-COMP-03 | Modo offline para consultas básicas | Média |
| RNF-COMP-04 | Telas de 4.7" a 12.9" | Alta |

### 12.7 Observabilidade

| Requisito | Especificação | Prioridade |
|-----------|--------------|------------|
| RNF-OBS-01 | Logging estruturado centralizado | Alta |
| RNF-OBS-02 | Métricas de aplicação em tempo real | Alta |
| RNF-OBS-03 | Tracing distribuído para debug | Média |
| RNF-OBS-04 | Alertas automáticos para anomalias | Alta |
| RNF-OBS-05 | Dashboards de monitoramento | Média |

---

## 13. Requisitos de Segurança e LGPD

### 13.1 Classificação de Dados

| Categoria | Exemplos | Nível de Proteção |
|-----------|----------|-------------------|
| Dados Públicos | Informações institucionais, notícias | Baixo |
| Dados Internos | Estatísticas agregadas, padrões | Médio |
| Dados Pessoais | Nome, email, telefone, endereço | Alto |
| Dados Sensíveis | Localização em tempo real, demografia | Muito Alto |

### 13.2 Requisitos LGPD

#### 13.2.1 Base Legal para Tratamento

| Dado | Base Legal | Justificativa |
|------|------------|---------------|
| Dados cadastrais | Consentimento | Necessário para criar conta |
| Localização | Consentimento | Funcionalidade de serviços próximos |
| Manifestações | Interesse público | Registro de demandas cidadãs |
| Dados demográficos | Consentimento | Opcional para análises |

#### 13.2.2 Direitos do Titular

| Direito | Implementação |
|---------|---------------|
| Acesso | Exportação de dados pessoais em formato legível |
| Correção | Edição de perfil e dados cadastrais |
| Exclusão | Anonimização/exclusão mediante solicitação |
| Portabilidade | Exportação em formato interoperável |
| Revogação | Gestão de consentimentos no app |
| Informação | Política de privacidade acessível |

#### 13.2.3 Medidas Técnicas

| Medida | Descrição |
|--------|-----------|
| Anonimização | Dados de localização agregados após período definido |
| Pseudonimização | Dados demográficos separados de identificadores |
| Minimização | Coleta apenas de dados necessários |
| Retenção | Política de retenção por tipo de dado |
| Consentimento | Granular e registrado com timestamp |

### 13.3 Política de Retenção de Dados

| Tipo de Dado | Período de Retenção | Ação após Período |
|--------------|---------------------|-------------------|
| Logs de acesso | 90 dias | Exclusão |
| Localização precisa | 24 horas | Agregação/Anonimização |
| Manifestações | 5 anos | Anonimização |
| Dados de conta | Enquanto ativo + 2 anos | Exclusão |
| Avaliações | Indefinido (anonimizado) | N/A |
| Conversas IA | 1 ano | Exclusão |

### 13.4 Arquitetura de Segurança

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CAMADAS DE SEGURANÇA                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

PERÍMETRO                   APLICAÇÃO                   DADOS
─────────                   ─────────                   ─────
    │                           │                          │
    ▼                           ▼                          ▼
┌──────────┐              ┌──────────┐              ┌──────────┐
│ WAF /    │              │ Validação│              │ TLS 1.3  │
│ DDoS     │──────────────│ de Input │──────────────│ (trânsito)│
│ Protection│             │          │              │          │
└──────────┘              └──────────┘              └──────────┘
    │                           │                          │
    ▼                           ▼                          ▼
┌──────────┐              ┌──────────┐              ┌──────────┐
│ API GW + │              │ Sanitiza-│              │ AES-256  │
│ Rate     │──────────────│ ção de   │──────────────│ (repouso)│
│ Limiting │              │ Output   │              │          │
└──────────┘              └──────────┘              └──────────┘
    │                           │                          │
    ▼                           ▼                          ▼
┌──────────┐              ┌──────────┐              ┌──────────┐
│ OAuth2/  │              │ RBAC /   │              │ RLS      │
│ OIDC     │──────────────│ Autoriza-│──────────────│ (linha)  │
│ (Keycloak)│             │ ção      │              │          │
└──────────┘              └──────────┘              └──────────┘
                               │                          │
                               ▼                          ▼
                          ┌──────────┐              ┌──────────┐
                          │ Auditoria│              │ Backup   │
                          │ de Ações │              │ Criptog. │
                          └──────────┘              └──────────┘
```

---

## 14. Regras de Negócio

### 14.1 Regras de Manifestações

| ID | Regra | Descrição |
|----|-------|-----------|
| RN-MAN-01 | Descrição mínima | Relatos urbanos: ≥ 30 chars; Transporte: ≥ 20 chars |
| RN-MAN-02 | Localização obrigatória | Relatos urbanos devem ter coordenadas ou endereço |
| RN-MAN-03 | Protocolo único | Todo registro gera protocolo no formato XXX-YYYY-NNNNNN |
| RN-MAN-04 | Severidade por IA | Prioridade/severidade é definida pelo workflow, não pelo usuário |
| RN-MAN-05 | Campos condicionais | Riscos moderados/críticos exigem escopo de afetados |
| RN-MAN-06 | Imutabilidade parcial | Manifestações enviadas não podem ter categoria alterada pelo usuário |

### 14.2 Regras de Avaliação de Serviços

| ID | Regra | Descrição |
|----|-------|-----------|
| RN-AVA-01 | Visita prévia | Avaliação só pode ser solicitada após detecção de visita |
| RN-AVA-02 | Janela de avaliação | Avaliação expira em 72 horas após visita |
| RN-AVA-03 | Uma avaliação por visita | Cidadão pode avaliar apenas uma vez por visita |
| RN-AVA-04 | Avaliação negativa | Estrelas ≤ 2 disparam oferta de encaminhamento |
| RN-AVA-05 | Atualização de média | Média do serviço é recalculada a cada nova avaliação |

### 14.3 Regras de Audiências

| ID | Regra | Descrição |
|----|-------|-----------|
| RN-AUD-01 | Vagas limitadas | Inscrição só é aceita se houver vagas disponíveis |
| RN-AUD-02 | Uma inscrição por usuário | Cidadão não pode se inscrever duas vezes na mesma audiência |
| RN-AUD-03 | Cancelamento | Inscrição pode ser cancelada até 2h antes do início |
| RN-AUD-04 | Notificações | Lembretes são enviados 24h, 2h e 15min antes |

### 14.4 Regras do Assistente IA

| ID | Regra | Descrição |
|----|-------|-----------|
| RN-IA-01 | Fontes oficiais | Respostas sobre legislação devem citar fonte oficial |
| RN-IA-02 | Limite de confiança | Confiança < 70% gera aviso ao usuário |
| RN-IA-03 | Escopo municipal | Temas fora do escopo são educadamente recusados |
| RN-IA-04 | Coleta estruturada | IA solicita dados faltantes um por vez |
| RN-IA-05 | Validação antes de persistir | Dados são validados antes de salvar no banco |
| RN-IA-06 | Gating inteligente | Se descrição inicial ≥ 30 chars, pula pergunta de descrição |
| RN-IA-07 | Não chutar datas | IA não assume data "hoje" sem confirmação explícita |

### 14.5 Regras de Notificação

| ID | Regra | Descrição |
|----|-------|-----------|
| RN-NOT-01 | Horário permitido | Notificações push apenas entre 8h e 21h |
| RN-NOT-02 | Limite diário | Máximo de 5 notificações por dia por usuário |
| RN-NOT-03 | Prioridade | Notificações críticas ignoram limite diário |
| RN-NOT-04 | Preferências | Respeitar preferências de canal do usuário |

### 14.6 Regras de Encaminhamento

| ID | Regra | Descrição |
|----|-------|-----------|
| RN-ENC-01 | Sugestão por match | Vereadores sugeridos por região + área de atuação |
| RN-ENC-02 | Score mínimo | Só sugere vereadores com score mínimo adequado |
| RN-ENC-03 | Um encaminhamento por manifestação | Cidadão escolhe um vereador por manifestação |
| RN-ENC-04 | Status tracking | Encaminhamento passa por: pendente → enviado → reconhecido → resolvido |

---

## 15. Estados e Ciclos de Vida

### 15.1 Ciclo de Vida - Relato Urbano

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CICLO DE VIDA: RELATO URBANO                                │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │ RASCUNHO │◀──────────────────────────────────────┐
    └────┬─────┘                                       │
         │                                             │
         │ Dados incompletos                           │ Usuário sai
         ▼                                             │
    ┌──────────┐                                       │
    │ EM_COLETA│───────────────────────────────────────┘
    └────┬─────┘
         │
         │ Dados completos
         ▼
    ┌──────────┐
    │ PENDENTE │
    └────┬─────┘
         │
         │ Enviado para workflow
         ▼
    ┌─────────────────┐
    │ EM_PROCESSAMENTO│
    └────────┬────────┘
             │
             │ Workflow recebe
             ▼
    ┌──────────┐
    │ EM_ANALISE│
    └────┬─────┘
         │
         │ IA classifica
         ▼
    ┌─────────────┐
    │ CLASSIFICADO│
    └────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────────┐ ┌──────────┐
│ENCAMINHA-│ │ ARQUIVADO│
│DO        │ └──────────┘
└────┬─────┘
     │
     │ Vereador reconhece
     ▼
┌─────────────────┐
│ EM_ATENDIMENTO  │
└────────┬────────┘
         │
         │ Ação concluída
         ▼
    ┌──────────┐
    │ RESOLVIDO│
    └──────────┘
```

### 15.2 Ciclo de Vida - Avaliação de Serviço

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                  CICLO DE VIDA: AVALIAÇÃO DE SERVIÇO                           │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ VISITA_DETECTADA │ ◀── GPS + Proximidade
    └────────┬─────────┘
             │
             │ Timer inicia
             ▼
    ┌──────────────────────┐
    │ AGUARDANDO_AVALIACAO │
    └────────┬─────────────┘
             │
             │ Push enviado
             ▼
    ┌──────────┐
    │ NOTIFICADO│
    └────┬─────┘
         │
    ┌────┴────────────┐
    │                 │
    ▼                 ▼ (72h sem resposta)
┌─────────────┐  ┌──────────┐
│ EM_AVALIACAO│  │ EXPIRADA │
└────┬────────┘  └──────────┘
     │
┌────┴────┐
│         │
▼         ▼
┌──────────┐ ┌──────────┐
│ CONCLUIDA│ │  PULADA  │
└──────────┘ └──────────┘
```

### 15.3 Ciclo de Vida - Encaminhamento

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CICLO DE VIDA: ENCAMINHAMENTO                               │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │ PENDENTE │ ◀── Cidadão solicita
    └────┬─────┘
         │
         │ Sistema notifica vereador
         ▼
    ┌──────────┐
    │ ENVIADO  │
    └────┬─────┘
         │
    ┌────┴────────────────────┐
    │                         │
    ▼                         ▼ (30 dias sem resposta)
┌─────────────┐          ┌──────────┐
│ RECONHECIDO │          │ EXPIRADO │
└────┬────────┘          └──────────┘
     │
     │ Ação iniciada
     ▼
┌──────────────────┐
│ EM_ATENDIMENTO   │
└────────┬─────────┘
         │
         │ Resposta enviada
         ▼
    ┌──────────┐
    │ RESOLVIDO│
    └──────────┘
```

### 15.4 Ciclo de Vida - Inscrição em Audiência

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                 CICLO DE VIDA: INSCRIÇÃO EM AUDIÊNCIA                          │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │ INSCRITO │ ◀── Cidadão se inscreve
    └────┬─────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼ (Sem vagas)
┌───────────┐ ┌─────────────┐
│ CONFIRMADO│ │ LISTA_ESPERA│
└────┬──────┘ └──────┬──────┘
     │               │
     │               │ Vaga liberada
     │               ▼
     │          ┌───────────┐
     │          │ CONFIRMADO│
     │          └─────┬─────┘
     │                │
     ▼                ▼
┌──────────┐    ┌──────────────┐
│ LEMBRADO │    │ NAO_CONVOCADO│ (Evento passou)
└────┬─────┘    └──────────────┘
     │
┌────┴────────┬────────────┐
│             │            │
▼             ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ PRESENTE │ │ AUSENTE  │ │ CANCELADO│
└──────────┘ └──────────┘ └──────────┘
```

---

## 16. Fluxos de Integração

### 16.1 Visão Geral de Integrações

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MAPA DE INTEGRAÇÕES                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   CÂMARA NA MÃO     │
                    │   (Backend API)     │
                    └──────────┬──────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
       ▼                       ▼                       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ PORTAL CMSP  │       │  SP LEGIS    │       │ GOOGLE MAPS  │
│              │       │     API      │       │  PLATFORM    │
│ • Notícias   │       │              │       │              │
│ • Agenda     │       │ • Vereadores │       │ • Geocoding  │
│              │       │ • Audiências │       │ • Places     │
│              │       │ • Comissões  │       │ • Directions │
└──────────────┘       └──────────────┘       └──────────────┘
       │                       │                       │
       │ Cron: */15 min        │ Cron: */2h            │ Sob demanda
       │                       │                       │
       ▼                       ▼                       ▼

       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
       ▼                       ▼                       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     N8N      │       │   FIREBASE   │       │  VERTEX AI   │
│  (Workflow)  │       │    (FCM)     │       │   (Gemini)   │
│              │       │              │       │              │
│ • Processa   │       │ • Push iOS   │       │ • LLM        │
│   manifesta- │       │ • Push       │       │ • Embeddings │
│   ções       │       │   Android    │       │              │
│ • Callbacks  │       │              │       │              │
└──────────────┘       └──────────────┘       └──────────────┘
```

### 16.2 Fluxo de Processamento de Manifestação

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                FLUXO: PROCESSAMENTO DE MANIFESTAÇÃO                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ CIDADÃO  │───▶│   APP    │───▶│   API    │───▶│    DB    │───▶│   N8N    │
│          │    │          │    │          │    │          │    │ WEBHOOK  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                                      │
                                    ┌─────────────────────────────────┘
                                    │
                                    ▼
                               ┌──────────────────────────────────────────────┐
                               │              N8N WORKFLOW                    │
                               ├──────────────────────────────────────────────┤
                               │                                              │
                               │  1. Recebe payload via webhook               │
                               │  2. Classifica prioridade                    │
                               │  3. Valida categoria                         │
                               │  4. Enriquece com dados contextuais          │
                               │  5. Detecta padrões similares                │
                               │  6. Gera tags automáticas                    │
                               │  7. Retorna via callback                     │
                               │                                              │
                               └──────────────────────────────────────────────┘
                                    │
                                    │ POST /callback
                                    ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ NOTIFICA │◀───│    DB    │◀───│   API    │◀───│ CALLBACK │
│ CIDADÃO  │    │ (update) │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘

Dados Atualizados pelo Callback:
• n8n_priority: "alta" | "media" | "baixa" | "critica"
• n8n_validated_category: categoria validada pelo workflow
• n8n_tags: ["buraco", "risco", "transito"]
• n8n_enriched_data: { similar_reports: 5, region_pattern: true }
• n8n_processed: true
• n8n_processed_at: timestamp
```

### 16.3 Fluxo de Busca de Serviços Próximos

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                  FLUXO: BUSCA DE SERVIÇOS PRÓXIMOS                             │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────┐    ┌──────────┐    ┌──────────┐
│ CIDADÃO  │───▶│   APP    │───▶│   API    │
│ "UBS     │    │ (lat/lng)│    │          │
│ perto"   │    │          │    │          │
└──────────┘    └──────────┘    └────┬─────┘
                                     │
                         ┌───────────┴───────────┐
                         │                       │
                         ▼                       ▼
                    ┌──────────┐            ┌──────────┐
                    │  CACHE   │            │    DB    │
                    │ (Redis)  │            │ (PostGIS)│
                    └────┬─────┘            └────┬─────┘
                         │                       │
                         │ Cache hit?            │
                         │                       │
                    ┌────┴────┐                  │
                    │         │                  │
                    ▼ Sim     ▼ Não              │
               ┌──────────┐                      │
               │ Retorna  │◀─────────────────────┘
               │ cache    │
               └──────────┘
                    │
                    │ Calcula distâncias
                    ▼
               ┌──────────┐
               │ GOOGLE   │
               │ DISTANCE │
               │ MATRIX   │
               └────┬─────┘
                    │
                    ▼
               ┌──────────┐    ┌──────────┐
               │ ORDENA   │───▶│ RETORNA  │
               │ POR DIST │    │ LISTA    │
               └──────────┘    └──────────┘
```

### 16.4 Fluxo de Autenticação

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       FLUXO: AUTENTICAÇÃO                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────┐    ┌──────────┐    ┌──────────┐
│ CIDADÃO  │───▶│   APP    │───▶│ KEYCLOAK │
│ (login)  │    │          │    │ /COGNITO │
└──────────┘    └──────────┘    └────┬─────┘
                                     │
                                     │ Valida credenciais
                                     ▼
                    ┌────────────────────────────────┐
                    │                                │
                    ▼ Válidas                        ▼ Inválidas
               ┌──────────┐                     ┌──────────┐
               │ GERA     │                     │   401    │
               │ TOKENS   │                     │ UNAUTH   │
               │ (access+ │                     └──────────┘
               │  refresh)│
               └────┬─────┘
                    │
                    ▼
               ┌──────────┐    ┌──────────┐    ┌──────────┐
               │   APP    │───▶│   API    │───▶│  VALIDA  │
               │ (armazena│    │ (bearer) │    │  TOKEN   │
               │  tokens) │    │          │    │          │
               └──────────┘    └──────────┘    └────┬─────┘
                                                    │
                                          ┌─────────┴─────────┐
                                          │                   │
                                          ▼ Válido            ▼ Expirado
                                     ┌──────────┐        ┌──────────┐
                                     │ RETORNA  │        │  REFRESH │
                                     │  DADOS   │        │  TOKEN   │
                                     └──────────┘        └──────────┘
```

### 16.5 Tratamento de Erros em Integrações

| Integração | Erro | Tratamento | Fallback |
|------------|------|------------|----------|
| Workflow (N8N) | Timeout | Retry com backoff exponencial (3x) | Fila de reprocessamento |
| Workflow (N8N) | 5xx | Retry com backoff exponencial (3x) | Marcar como "pendente_manual" |
| Google Maps | Indisponível | Cache de última localização | Solicitar endereço manual |
| Google Maps | Quota excedida | Aguardar reset | Cache + entrada manual |
| Portal CMSP | Indisponível | Cache de conteúdo | Exibir dados em cache |
| SP Legis | Timeout | Retry (2x) | Dados em cache |
| Firebase/FCM | Falha | Retry + fila | Log para reenvio manual |
| Vertex AI | Quota/Error | Retry (2x) | Mensagem de indisponibilidade |

---

## 17. Cenários de Erro e Contingência

### 17.1 Matriz de Contingência

| Cenário | Impacto | Detecção | Resposta | Recuperação |
|---------|---------|----------|----------|-------------|
| GPS indisponível | Médio | Timeout API | Solicitar endereço | Geocodificação manual |
| Sem conexão | Alto | Network check | Modo offline | Sincronização posterior |
| API indisponível | Alto | Health check | Cache + retry | Failover automático |
| Workflow falha | Médio | Callback timeout | Fila de retry | Processamento manual |
| Auth service down | Crítico | Health check | Token em cache | Failover para backup |
| Banco indisponível | Crítico | Connection check | Read replica | Failover automático |
| Rate limit atingido | Baixo | 429 response | Backoff | Aguardar reset |

### 17.2 Modo Offline

**Funcionalidades Disponíveis Offline:**
- Visualização de dados em cache (perfil, histórico, favoritos)
- Rascunho de novas manifestações
- Consulta de informações institucionais cacheadas
- Visualização de mapa com tiles em cache

**Funcionalidades Indisponíveis Offline:**
- Envio de manifestações (enfileiradas para sync)
- Busca de serviços em tempo real
- Participação em audiências ao vivo
- Conversas com assistente IA

### 17.3 Fluxo de Sincronização Offline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      FLUXO: SINCRONIZAÇÃO OFFLINE                              │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌────────────────┐
    │ App detecta    │
    │ modo offline   │
    └───────┬────────┘
            │
            ▼
    ┌────────────────┐
    │ Ativa modo     │
    │ offline        │
    └───────┬────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Usuário cria dados? │
    └───────┬─────────────┘
            │
       ┌────┴────┐
       │         │
       ▼ Sim     ▼ Não
┌────────────┐  ┌────────────┐
│ Armazena   │  │ Exibe      │
│ localmente │  │ dados em   │
└─────┬──────┘  │ cache      │
      │         └────────────┘
      ▼
┌────────────┐
│ Marca para │
│ sincroniz. │
└─────┬──────┘
      │
      │ (Conexão restaurada)
      ▼
┌────────────────┐
│ Inicia         │
│ sincronização  │
└───────┬────────┘
        │
        ▼
┌─────────────────────┐
│ Dados pendentes?    │
└───────┬─────────────┘
        │
   ┌────┴────┐
   │         │
   ▼ Sim     ▼ Não
┌────────────┐  ┌────────────┐
│ Envia      │  │ Atualiza   │
│ para API   │  │ cache      │
└─────┬──────┘  └────────────┘
      │
      ▼
┌─────────────────────┐
│ Sucesso?            │
└───────┬─────────────┘
        │
   ┌────┴────┐
   │         │
   ▼ Sim     ▼ Não
┌────────────┐  ┌────────────┐
│ Remove da  │  │ Retry com  │
│ fila       │  │ backoff    │
└─────┬──────┘  └────────────┘
      │
      ▼
┌────────────┐
│ Notifica   │
│ usuário    │
└────────────┘
```

---

## 18. Protocolos e Formatos

### 18.1 Formato de Protocolo

| Tipo | Formato | Exemplo | Descrição |
|------|---------|---------|-----------|
| Relato Urbano | URB-YYYY-NNNNNN | URB-2025-000123 | Sequencial por ano |
| Transporte | TRP-YYYY-NNNNNN | TRP-2025-000456 | Sequencial por ano |
| Avaliação | AVA-YYYY-NNNNNN | AVA-2025-000789 | Sequencial por ano |

### 18.2 Formato de Localização

```json
{
  "location_point": {
    "latitude": -23.550520,
    "longitude": -46.633308,
    "accuracy": 10.5,
    "source": "gps|manual|geocoding"
  },
  "address": {
    "street": "Rua Augusta",
    "number": "1500",
    "complement": null,
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP",
    "zip_code": "01310-100",
    "reference_point": "Próximo ao shopping"
  }
}
```

### 18.3 Formato de Resposta da API

```json
{
  "success": true,
  "data": { },
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "request_id": "uuid",
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 150,
      "total_pages": 8
    }
  },
  "errors": []
}
```

### 18.4 Formato de Erro

```json
{
  "success": false,
  "data": null,
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "request_id": "uuid"
  },
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "field": "description",
      "message": "Descrição deve ter no mínimo 30 caracteres",
      "details": {
        "min_length": 30,
        "current_length": 15
      }
    }
  ]
}
```

### 18.5 Formato de Payload do Workflow

```json
{
  "event": "urban_report_created",
  "version": "3.0",
  "timestamp": "2025-01-15T10:30:00Z",
  "report": {
    "id": "uuid",
    "protocol": "URB-2025-000123",
    "category": "via_publica",
    "subcategory": "buraco",
    "description": "...",
    "location": { },
    "risk_level": "critico",
    "affected_scope": "rua",
    "photos": ["url1", "url2"],
    "severity_pending_classification": true
  },
  "user": {
    "id": "uuid",
    "name": "Nome do Cidadão",
    "neighborhood": "Bela Vista"
  },
  "orchestrator": {
    "source_tool": "create_urban_report",
    "conversation_id": "uuid",
    "tool_arguments": { }
  },
  "callback_url": "https://api.example.com/callback"
}
```

---

## 19. Matriz de Rastreabilidade

### 19.1 Casos de Uso x Ferramentas IA

| Caso de Uso | Ferramenta Principal | Ferramentas Auxiliares |
|-------------|---------------------|------------------------|
| CSU001 - Acolhimento | get_citizen_history | search_knowledge_base |
| CSU002 - Audiências | search_audiencias | - |
| CSU003 - Navegação | search_knowledge_base | - |
| CSU004 - Avaliação | create_service_rating | find_nearby_services |
| CSU005 - Transporte | create_transport_report | suggest_council_member |
| CSU006 - Dashboard | N/A (consulta analítica) | - |
| CSU007 - Mapa | find_nearby_services | - |
| CSU008 - Relatos | create_urban_report | suggest_council_member |

### 19.2 Personas x Casos de Uso

| Caso de Uso | Cidadão | Engajado | Assessor | Vereador | Gestor | Admin |
|-------------|---------|----------|----------|----------|--------|-------|
| CSU001 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CSU002 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CSU003 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CSU004 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CSU005 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CSU006 | Parcial | Parcial | ✓ | ✓ | ✓ | ✓ |
| CSU007 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CSU008 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 19.3 Módulos x Integrações

| Módulo | Portal CMSP | SP Legis | Google Maps | N8N | Firebase | Vertex AI |
|--------|-------------|----------|-------------|-----|----------|-----------|
| Acolhimento | - | - | - | - | - | ✓ |
| Relatos Urbanos | - | - | ✓ | ✓ | ✓ | ✓ |
| Transporte | - | - | - | ✓ | ✓ | ✓ |
| Avaliações | - | - | ✓ | - | ✓ | ✓ |
| Audiências | ✓ | ✓ | - | - | ✓ | - |
| Institucional | ✓ | ✓ | - | - | - | ✓ |
| Mapa | - | - | ✓ | - | - | - |
| Analytics | - | - | - | - | - | - |

---

## 20. Premissas e Restrições

### 20.1 Premissas

| ID | Premissa | Impacto se Falsa |
|----|----------|------------------|
| P1 | Cidadãos possuem smartphones com iOS 14+ ou Android 10+ | Redução de base de usuários |
| P2 | Câmara Municipal fornecerá APIs de integração | Funcionalidades limitadas |
| P3 | Usuários têm acesso à internet (3G mínimo) | Necessidade de modo offline robusto |
| P4 | Dados de serviços públicos são atualizados regularmente | Informações desatualizadas |
| P5 | Vereadores e assessores responderão encaminhamentos | Frustração dos cidadãos |
| P6 | LGPD será mantida na forma atual | Ajustes de compliance |
| P7 | Equipe terá acesso a serviços de geolocalização | Funcionalidade de mapa comprometida |

### 20.2 Restrições

| ID | Restrição | Tipo | Justificativa |
|----|-----------|------|---------------|
| R1 | Aplicativo React Native (cross-platform) | Técnica | Custo e manutenção |
| R2 | Hospedagem em infraestrutura de nuvem | Técnica | Escalabilidade |
| R3 | Conformidade com LGPD | Legal | Obrigação legal |
| R4 | Acessibilidade WCAG 2.1 AA | Legal/UX | Inclusão digital |
| R5 | Alta disponibilidade do sistema | Operacional | SLA acordado |
| R6 | Dados sensíveis em território brasileiro | Legal | Soberania de dados |
| R7 | Integração apenas com APIs oficiais CMSP | Política | Dados autorizados |

### 20.3 Dependências Externas

| Dependência | Fornecedor | Criticidade | Plano B |
|-------------|-----------|-------------|---------|
| APIs de notícias e agenda | Portal CMSP | Média | Cache prolongado |
| APIs de vereadores e audiências | SP Legis | Alta | Dados estáticos |
| Serviço de geolocalização | Google Maps | Alta | Entrada manual |
| Serviço de mapas | Google Maps | Alta | Tiles offline |
| Serviço de notificações push | Firebase (FCM) | Média | Email fallback |
| Serviço de LLM | Google Vertex AI | Alta | Fallback para modelo menor |
| Infraestrutura de nuvem | AWS/GCP | Crítica | Multi-cloud |

---

## 21. Métricas de Sucesso (KPIs)

### 21.1 KPIs de Adoção

| Métrica | Indicador de Sucesso | Fonte |
|---------|---------------------|-------|
| Downloads | Crescimento contínuo de downloads | App stores |
| Usuários ativos mensais (MAU) | Crescimento da base ativa | Analytics |
| Taxa de retenção D30 | Aumento na retenção de usuários | Analytics |
| NPS (Net Promoter Score) | Satisfação geral positiva | Pesquisa |

### 21.2 KPIs de Engajamento

| Métrica | Indicador de Sucesso | Fonte |
|---------|---------------------|-------|
| Manifestações por mês | Aumento no volume de registros | Banco de dados |
| Avaliações por mês | Crescimento nas avaliações | Banco de dados |
| Inscrições em audiências | Aumento na participação | Banco de dados |
| Conversas com IA por usuário | Engajamento com assistente | Analytics |

### 21.3 KPIs de Qualidade

| Métrica | Indicador de Sucesso | Fonte |
|---------|---------------------|-------|
| Taxa de sucesso de manifestações | Alta taxa de conclusão | Banco de dados |
| Tempo médio de registro | Redução no tempo | Analytics |
| Taxa de encaminhamentos respondidos | Aumento nas respostas | Banco de dados |
| Satisfação com respostas IA | Feedback positivo | Feedback |

### 21.4 KPIs Técnicos

| Métrica | Indicador de Sucesso | Fonte |
|---------|---------------------|-------|
| Disponibilidade | Alta disponibilidade | Monitoramento |
| Tempo de resposta P95 | Latência baixa | APM |
| Taxa de erro | Baixa taxa de erros | Logs |
| Crash-free sessions | Estabilidade alta | Crashlytics |

---

## 22. Glossário

| Termo | Definição |
|-------|-----------|
| **Audiência Pública** | Reunião aberta para discussão de temas legislativos com participação cidadã |
| **Câmara Explica** | Módulo educativo que explica conceitos legislativos em linguagem simples |
| **CMSP** | Câmara Municipal de São Paulo |
| **Comissão** | Grupo de vereadores que trata de tema específico (Saúde, Educação, etc.) |
| **Drill-down** | Navegação analítica do geral para o específico |
| **Encaminhamento** | Vinculação de uma manifestação a um vereador para acompanhamento |
| **LLM** | Large Language Model - modelo de linguagem grande (IA generativa) |
| **Manifestação** | Registro formal de demanda cidadã (relato, diagnóstico ou avaliação) |
| **Orquestrador** | Sistema de IA que coordena a interação e aciona ferramentas específicas |
| **Protocolo** | Código único de identificação de uma manifestação |
| **RAG** | Retrieval-Augmented Generation - técnica de IA que combina busca com geração |
| **RBAC** | Role-Based Access Control - controle de acesso baseado em papéis |
| **Relato Urbano** | Registro de problema em via pública, infraestrutura ou serviços |
| **RLS** | Row Level Security - controle de acesso a nível de registro no banco |
| **Tool** | Ferramenta específica acionada pelo orquestrador IA |
| **UBS** | Unidade Básica de Saúde |
| **Vereador/Vereadora** | Representante eleito no legislativo municipal |
| **Workflow** | Fluxo automatizado de processamento de manifestações |

---

*Este documento é propriedade da Câmara Municipal de São Paulo e contém informações sobre o projeto Câmara na Mão.*
