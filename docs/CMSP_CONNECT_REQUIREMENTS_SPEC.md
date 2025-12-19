# Especificação de Requisitos - CMSP Connect
## Documento Agnóstico de Tecnologia

---

| **Campo** | **Valor** |
|-----------|-----------|
| **Projeto** | CMSP Connect - Aplicativo de Participação Cidadã |
| **Cliente** | Câmara Municipal de São Paulo (CMSP) |
| **Versão** | 1.0 |
| **Data** | Dezembro 2025 |
| **Classificação** | Documento de Requisitos |
| **Status** | Para Validação |

---

## Sumário

1. [Visão do Produto](#1-visão-do-produto)
2. [Stakeholders e Perfis de Usuário](#2-stakeholders-e-perfis-de-usuário)
3. [Requisitos Funcionais](#3-requisitos-funcionais)
4. [Requisitos Não Funcionais](#4-requisitos-não-funcionais)
5. [Jornadas de Usuário](#5-jornadas-de-usuário)
6. [Regras de Negócio](#6-regras-de-negócio)
7. [Integrações Obrigatórias](#7-integrações-obrigatórias)
8. [Restrições e Premissas](#8-restrições-e-premissas)
9. [Critérios de Aceitação](#9-critérios-de-aceitação)
10. [Glossário](#10-glossário)

---

## 1. Visão do Produto

### 1.1 Problema

A Câmara Municipal de São Paulo enfrenta desafios significativos na comunicação com os 12+ milhões de munícipes:

| Problema | Impacto |
|----------|---------|
| Complexidade institucional | Cidadãos não compreendem o processo legislativo |
| Fragmentação de canais | Múltiplos pontos de contato sem integração |
| Baixo engajamento | Participação limitada a audiências presenciais |
| Demandas não rastreáveis | Relatos perdem-se em processos manuais |
| Ausência de inteligência | Decisões sem base em dados agregados |

### 1.2 Solução

O **CMSP Connect** é uma plataforma digital de participação cidadã que utiliza **Inteligência Artificial conversacional** como interface principal para:

1. **Informar**: Replicar notícias, agendas e conteúdos institucionais da Câmara
2. **Dar voz**: Permitir que o cidadão expresse demandas em linguagem natural
3. **Organizar**: Classificar, categorizar e priorizar manifestações automaticamente
4. **Conectar**: Direcionar demandas aos representantes e comissões adequadas
5. **Medir**: Gerar inteligência para tomada de decisão pela CMSP

### 1.3 Proposta de Valor

| Para Cidadãos | Para a Câmara Municipal |
|---------------|-------------------------|
| Comunicação natural via chat | Visão unificada de manifestações |
| Descoberta de serviços próximos | Categorização automática por IA |
| Acompanhamento de demandas | Priorização inteligente |
| Acesso simplificado a informações | Encaminhamento sugerido para comissões |
| Transparência do processo legislativo | Métricas de engajamento em tempo real |

### 1.4 Resultados Esperados

| Métrica | Meta |
|---------|------|
| Engajamento cidadão | +300% vs canais tradicionais |
| Tempo de triagem | -70% |
| Resoluções efetivas | +50% |
| Rastreabilidade | 100% das demandas |

---

## 2. Stakeholders e Perfis de Usuário

### 2.1 Perfis de Acesso

| Perfil | Descrição | Permissões |
|--------|-----------|------------|
| **Cidadão** | Munícipe de São Paulo | Acesso ao app, criar manifestações, avaliar serviços, acompanhar demandas |
| **Vereador** | Parlamentar eleito | Visualizar manifestações de sua base, responder encaminhamentos |
| **Assessor** | Equipe de apoio parlamentar | Apoiar vereador na gestão de demandas |
| **Gestor** | Administrador da CMSP | Acesso ao CMS, dashboards, gestão de encaminhamentos |
| **Administrador** | Administrador técnico | Acesso total, configurações do sistema, logs |

### 2.2 Personas Principais

#### Persona 1: Cidadão Engajado
- **Nome**: Maria, 45 anos
- **Contexto**: Mora na Zona Sul, usa transporte público diariamente
- **Necessidades**: Reportar problemas de forma rápida, acompanhar resolução
- **Barreiras**: Pouca familiaridade com tecnologia, tempo limitado
- **Expectativa**: Interface simples, resposta em linguagem acessível

#### Persona 2: Cidadão Informacional
- **Nome**: João, 28 anos
- **Contexto**: Primeiro apartamento, quer entender como funciona a câmara
- **Necessidades**: Saber sobre audiências, acompanhar vereadores do bairro
- **Barreiras**: Não sabe por onde começar
- **Expectativa**: Conteúdo educativo, notificações relevantes

#### Persona 3: Gestor CMSP
- **Nome**: Dr. Carlos, 52 anos
- **Contexto**: Coordenador de atendimento ao cidadão
- **Necessidades**: Visão consolidada de demandas, métricas, priorização
- **Barreiras**: Volume alto de demandas, triagem manual
- **Expectativa**: Dashboard inteligente, automação de categorização

---

## 3. Requisitos Funcionais

### 3.1 Módulo: Acolhimento Digital (RF-01)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-01.01 | O sistema deve exibir saudação personalizada baseada no horário (Bom dia/Boa tarde/Boa noite) | Alta |
| RF-01.02 | O sistema deve exibir carrossel com até 3 novidades legislativas relevantes | Média |
| RF-01.03 | O sistema deve exibir próxima audiência pública de interesse do usuário (baseado em seus temas) | Alta |
| RF-01.04 | O sistema deve exibir botões de ação rápida para principais funcionalidades | Alta |
| RF-01.05 | O sistema deve exibir card de completude do perfil se dados estiverem incompletos | Baixa |
| RF-01.06 | O sistema deve exibir tutorial de onboarding no primeiro acesso | Alta |
| RF-01.07 | O sistema deve permitir que usuário "pule" o onboarding | Alta |

### 3.2 Módulo: Assistente IA - Interface Conversacional (RF-02)

> **Requisito de Cliente**: A interface conversacional (chatbot) é o ponto central de interação do aplicativo.

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-02.01 | O sistema deve oferecer interface de chat como método principal de interação | Alta |
| RF-02.02 | O sistema deve conduzir coleta de informações via perguntas naturais, não formulários | Alta |
| RF-02.03 | O sistema deve classificar automaticamente a intenção do usuário | Alta |
| RF-02.04 | O sistema deve direcionar conversas para sub-agentes especializados por domínio | Alta |
| RF-02.05 | O sistema deve manter histórico de conversas do usuário | Alta |
| RF-02.06 | O sistema deve permitir retomar conversas anteriores | Média |
| RF-02.07 | O sistema deve oferecer "válvula de escape" quando IA não compreende | Alta |
| RF-02.08 | O sistema deve exibir indicador visual de "digitando" durante processamento | Média |
| RF-02.09 | O sistema deve confirmar informações antes de registrar manifestação | Alta |
| RF-02.10 | O sistema deve citar fontes oficiais quando fornecer informações institucionais | Alta |

#### 3.2.1 Sub-agentes Especializados

| Sub-agente | Domínio | Capacidades |
|------------|---------|-------------|
| **Audiências** | Audiências Públicas | Informar sobre audiências, inscrever usuário, lembrar datas |
| **Avaliação** | Serviços Públicos | Coletar avaliações de UBS, escolas, etc. |
| **Urbano** | Relatos Urbanos | Registrar problemas de infraestrutura, limpeza, iluminação |
| **Transporte** | Transporte Público | Registrar problemas de ônibus, metrô, trem |
| **Institucional** | Câmara Municipal | Informar sobre vereadores, comissões, processo legislativo |

### 3.3 Módulo: Audiências Públicas (RF-03)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-03.01 | O sistema deve listar audiências públicas futuras e passadas | Alta |
| RF-03.02 | O sistema deve permitir filtrar audiências por tema, data e status | Alta |
| RF-03.03 | O sistema deve exibir detalhes da audiência (tema, data, local, descrição, documentos) | Alta |
| RF-03.04 | O sistema deve permitir inscrição em audiências presenciais (se houver vagas) | Alta |
| RF-03.05 | O sistema deve exibir link de transmissão para audiências virtuais | Alta |
| RF-03.06 | O sistema deve notificar usuário antes de audiência inscrita | Alta |
| RF-03.07 | O sistema deve registrar histórico de participações do usuário | Média |

### 3.4 Módulo: Avaliação de Serviços Públicos (RF-04)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-04.01 | O sistema deve permitir avaliação de serviços públicos via chat | Alta |
| RF-04.02 | O sistema deve coletar nota (1-5 estrelas) e comentário | Alta |
| RF-04.03 | O sistema deve perguntar proativamente sobre serviços utilizados recentemente | Média |
| RF-04.04 | O sistema deve analisar sentimento do comentário | Alta |
| RF-04.05 | O sistema deve oferecer opção de anonimato | Alta |
| RF-04.06 | O sistema deve categorizar avaliação por tipo de serviço e região | Alta |
| RF-04.07 | O sistema deve oferecer encaminhamento à comissão se avaliação ≤ 2 estrelas | Alta |
| RF-04.08 | O sistema deve agregar avaliações por serviço para exibição pública | Alta |

### 3.5 Módulo: Relatos Urbanos (RF-05)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-05.01 | O sistema deve permitir registro de problemas urbanos via chat conversacional | Alta |
| RF-05.02 | O sistema deve coletar: categoria, localização, descrição, fotos (opcional) | Alta |
| RF-05.03 | O sistema deve classificar categoria automaticamente via IA | Alta |
| RF-05.04 | O sistema deve calcular severidade baseada no relato | Alta |
| RF-05.05 | O sistema deve gerar protocolo único para cada relato | Alta |
| RF-05.06 | O sistema deve permitir acompanhamento do status do relato | Alta |
| RF-05.07 | O sistema deve notificar usuário sobre atualizações do relato | Alta |
| RF-05.08 | O sistema deve permitir comentários de outros cidadãos no relato | Baixa |
| RF-05.09 | O sistema deve permitir "apoiar" (curtir) relatos de outros cidadãos | Baixa |
| RF-05.10 | O sistema deve oferecer formulário manual como alternativa ao chat | Média |

#### 3.5.1 Categorias de Relatos Urbanos

| Categoria | Exemplos | Comissão Sugerida |
|-----------|----------|-------------------|
| Infraestrutura | Buraco, calçada quebrada, obra parada | Política Urbana |
| Iluminação | Poste apagado, lâmpada queimada | Serviços Públicos |
| Limpeza | Lixo, entulho, coleta irregular | Serviços Públicos |
| Meio Ambiente | Poda de árvore, poluição, alagamento | Meio Ambiente |
| Segurança | Área perigosa, iluminação precária | Segurança Pública |
| Acessibilidade | Rampa quebrada, falta de piso tátil | Direitos Humanos |

### 3.6 Módulo: Diagnóstico de Transporte (RF-06)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-06.01 | O sistema deve permitir registro de problemas de transporte via chat | Alta |
| RF-06.02 | O sistema deve coletar: tipo de transporte, linha, horário, tipo de problema | Alta |
| RF-06.03 | O sistema deve classificar tipo de problema automaticamente | Alta |
| RF-06.04 | O sistema deve calcular severidade baseada no impacto | Alta |
| RF-06.05 | O sistema deve direcionar relatos à Comissão de Transportes | Alta |
| RF-06.06 | O sistema deve detectar padrões de recorrência por linha/horário | Alta |
| RF-06.07 | O sistema deve notificar usuário quando padrão detectado afeta sua linha | Média |
| RF-06.08 | O sistema deve permitir acompanhamento do status do relato | Alta |

#### 3.6.1 Tipos de Problema de Transporte

| Categoria | Exemplos |
|-----------|----------|
| Atrasos | Ônibus não passou, intervalo longo |
| Lotação | Superlotação, impossibilidade de embarque |
| Infraestrutura | Ponto danificado, falta de abrigo |
| Atendimento | Má conduta do motorista/cobrador |
| Acessibilidade | Elevador quebrado, rampa indisponível |
| Segurança | Assalto, assédio, iluminação precária |

### 3.7 Módulo: Mapa de Serviços Públicos (RF-07)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-07.01 | O sistema deve exibir mapa interativo com equipamentos públicos | Alta |
| RF-07.02 | O sistema deve solicitar permissão de localização do usuário | Alta |
| RF-07.03 | O sistema deve centralizar mapa na localização do usuário | Alta |
| RF-07.04 | O sistema deve exibir equipamentos em raio configurável | Alta |
| RF-07.05 | O sistema deve permitir filtrar por tipo de serviço | Alta |
| RF-07.06 | O sistema deve exibir detalhes do equipamento (nome, endereço, telefone, avaliação) | Alta |
| RF-07.07 | O sistema deve permitir traçar rotas até o equipamento | Média |
| RF-07.08 | O sistema deve exibir avaliações agregadas do equipamento | Alta |
| RF-07.09 | O sistema deve permitir avaliar equipamento diretamente do card | Alta |

#### 3.7.1 Tipos de Equipamento

| Tipo | Ícone Sugerido |
|------|----------------|
| UBS | 🏥 |
| Hospital | 🏨 |
| Escola Municipal | 🏫 |
| CEU | 🎭 |
| Biblioteca | 📚 |
| Centro Esportivo | ⚽ |

### 3.8 Módulo: Notificações (RF-08)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-08.01 | O sistema deve notificar sobre audiências de interesse do usuário | Alta |
| RF-08.02 | O sistema deve notificar sobre atualizações de relatos do usuário | Alta |
| RF-08.03 | O sistema deve notificar sobre respostas de encaminhamentos | Alta |
| RF-08.04 | O sistema deve respeitar janela de horário para notificações (8h-20h) | Alta |
| RF-08.05 | O sistema deve permitir configurar tipos de notificação desejados | Média |
| RF-08.06 | O sistema deve permitir desativar notificações por categoria | Média |
| RF-08.07 | O sistema deve marcar notificações como lidas | Baixa |

### 3.9 Módulo: Perfil do Usuário (RF-09)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-09.01 | O sistema deve permitir edição de dados pessoais (nome, telefone, foto) | Alta |
| RF-09.02 | O sistema deve permitir cadastro de endereço principal | Alta |
| RF-09.03 | O sistema deve permitir cadastro de dados demográficos (opcional) | Média |
| RF-09.04 | O sistema deve permitir seleção de temas de interesse | Alta |
| RF-09.05 | O sistema deve permitir configuração de preferências de comunicação | Média |
| RF-09.06 | O sistema deve permitir controle de visibilidade do perfil | Baixa |
| RF-09.07 | O sistema deve exibir indicador de completude do perfil | Baixa |

#### 3.9.1 Dados Demográficos (Opcionais)

> **IMPORTANTE**: Dados demográficos são coletados apenas para fins estatísticos agregados e devem ser armazenados com proteção especial conforme LGPD.

| Campo | Opções | Obrigatório |
|-------|--------|-------------|
| Data de Nascimento | Data | Não |
| Gênero | Masculino, Feminino, Não-binário, Prefiro não dizer | Não |
| Raça/Cor | Branca, Preta, Parda, Amarela, Indígena, Prefiro não dizer | Não |
| Faixa de Renda | Até 2SM, 2-5SM, 5-10SM, >10SM, Prefiro não dizer | Não |

### 3.10 Módulo: Área Administrativa (RF-10)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-10.01 | O sistema deve exibir dashboard com KPIs principais | Alta |
| RF-10.02 | O sistema deve exibir Kanban de gestão de manifestações | Alta |
| RF-10.03 | O sistema deve permitir filtrar manifestações por categoria, região, período, status | Alta |
| RF-10.04 | O sistema deve permitir alterar status de manifestações | Alta |
| RF-10.05 | O sistema deve permitir encaminhar manifestações a comissões/vereadores | Alta |
| RF-10.06 | O sistema deve exibir análise de sentimento agregada | Alta |
| RF-10.07 | O sistema deve permitir exportar dados (CSV, XLS) | Alta |
| RF-10.08 | O sistema deve registrar logs de auditoria de todas as ações | Alta |
| RF-10.09 | O sistema deve permitir gestão de usuários administrativos | Alta |
| RF-10.10 | O sistema deve exibir métricas de tempo de resposta | Média |

#### 3.10.1 KPIs do Dashboard

| KPI | Descrição | Fórmula |
|-----|-----------|---------|
| Total de Relatos | Quantidade de manifestações no período | COUNT(manifestações) |
| Taxa de Resolução | % de manifestações resolvidas | Resolvidas / Total × 100 |
| Tempo Médio de Resposta | Tempo até primeira resposta | AVG(data_resposta - data_criação) |
| Sentimento Médio | Score médio de sentimento | AVG(score_sentimento) |
| Engajamento | Usuários ativos no período | COUNT(DISTINCT usuários_ativos) |

### 3.11 Módulo: Navegação Institucional (RF-11)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-11.01 | O sistema deve oferecer menu de navegação institucional | Média |
| RF-11.02 | O sistema deve redirecionar para Portal CMSP para conteúdos existentes | Média |
| RF-11.03 | O sistema deve manter consistência visual durante redirecionamento | Baixa |

#### 3.11.1 Itens do Menu Institucional

| Item | Ação | Destino |
|------|------|---------|
| Agenda da CMSP | Redirect externo | Portal CMSP - Agenda |
| Vereadores | Redirect externo | Portal CMSP - Vereadores |
| Conheça a Câmara | Redirect externo | Portal CMSP - Institucional |
| Câmara Explica | Redirect externo | Portal CMSP - Educativo |
| Escola do Parlamento | Redirect externo | Portal CMSP - Escola |
| Notícias | Redirect externo | Portal CMSP - Notícias |

---

## 4. Requisitos Não Funcionais

### 4.1 Performance (RNF-01)

| ID | Requisito | Métrica |
|----|-----------|---------|
| RNF-01.01 | Tempo de carregamento inicial | ≤ 3 segundos em 4G |
| RNF-01.02 | Tempo de resposta de APIs | ≤ 2 segundos para 95% das requisições |
| RNF-01.03 | Tempo de resposta da IA | ≤ 5 segundos para primeira resposta |
| RNF-01.04 | Streaming de respostas IA | Tokens devem ser exibidos progressivamente |
| RNF-01.05 | Capacidade de usuários simultâneos | ≥ 100.000 |

### 4.2 Disponibilidade (RNF-02)

| ID | Requisito | Métrica |
|----|-----------|---------|
| RNF-02.01 | Uptime mensal | ≥ 99.5% |
| RNF-02.02 | Recovery Time Objective (RTO) | ≤ 4 horas |
| RNF-02.03 | Recovery Point Objective (RPO) | ≤ 1 hora |
| RNF-02.04 | Backup de dados | Diário com retenção de 30 dias |

### 4.3 Segurança (RNF-03)

| ID | Requisito | Especificação |
|----|-----------|---------------|
| RNF-03.01 | Criptografia em trânsito | TLS 1.3 obrigatório |
| RNF-03.02 | Criptografia em repouso | AES-256 para dados sensíveis |
| RNF-03.03 | Autenticação | Email/senha + opção de redes sociais |
| RNF-03.04 | Tokens de sessão | JWT com expiração de 24h |
| RNF-03.05 | Proteção contra OWASP Top 10 | Validação de entrada, rate limiting, etc. |
| RNF-03.06 | Logs de auditoria | Todas as ações administrativas logadas |
| RNF-03.07 | Controle de acesso | RBAC (Role-Based Access Control) |

### 4.4 Conformidade LGPD (RNF-04)

| ID | Requisito | Especificação |
|----|-----------|---------------|
| RNF-04.01 | Consentimento explícito | Opt-in para coleta de dados demográficos |
| RNF-04.02 | Direito de acesso | Exportação de dados pessoais pelo usuário |
| RNF-04.03 | Direito de exclusão | Exclusão de conta e dados mediante solicitação |
| RNF-04.04 | Anonimização | Dados agregados devem ser anonimizados |
| RNF-04.05 | Política de retenção | Dados de relatos: 5 anos; Logs: 1 ano |
| RNF-04.06 | Dados de localização | Armazenados apenas durante sessão ativa |
| RNF-04.07 | Minimização de dados | Coletar apenas dados necessários |

### 4.5 Acessibilidade (RNF-05)

| ID | Requisito | Especificação |
|----|-----------|---------------|
| RNF-05.01 | Conformidade WCAG | Nível AA (2.1) |
| RNF-05.02 | Contraste de texto | Razão mínima 4.5:1 |
| RNF-05.03 | Navegação por teclado | 100% das funções acessíveis |
| RNF-05.04 | Leitores de tela | Labels semânticos em todos elementos |
| RNF-05.05 | Ajuste de fonte | Suporte a zoom até 200% |
| RNF-05.06 | Modo escuro | Alternância por preferência do sistema |

### 4.6 Usabilidade (RNF-06)

| ID | Requisito | Especificação |
|----|-----------|---------------|
| RNF-06.01 | Plataforma | Aplicativo móvel nativo (Android + iOS) |
| RNF-06.02 | Versões suportadas | Android 8+ e iOS 14+ |
| RNF-06.03 | Linguagem | Português brasileiro, linguagem cidadã |
| RNF-06.04 | Onboarding | Tutorial guiado no primeiro acesso |
| RNF-06.05 | Feedback visual | Indicadores de carregamento e sucesso |
| RNF-06.06 | Modo offline | Consulta de histórico e drafts offline |

### 4.7 Escalabilidade (RNF-07)

| ID | Requisito | Especificação |
|----|-----------|---------------|
| RNF-07.01 | Arquitetura | Preparada para escalonamento horizontal |
| RNF-07.02 | Cache | Camada de cache para dados frequentes |
| RNF-07.03 | Filas | Processamento assíncrono para operações pesadas |
| RNF-07.04 | CDN | Distribuição de assets estáticos |

---

## 5. Jornadas de Usuário

### 5.1 Jornada: Primeiro Acesso

```
┌────────────────────────────────────────────────────────────────┐
│                    PRIMEIRO ACESSO                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. Download do App                                            │
│         ↓                                                      │
│  2. Splash Screen (2-3 segundos)                               │
│         ↓                                                      │
│  3. Telas de Boas-vindas (carrossel explicativo)               │
│         ↓                                                      │
│  4. Cadastro (email/senha ou rede social)                      │
│         ↓                                                      │
│  5. Onboarding: Seleção de Interesses                          │
│         ↓                                                      │
│  6. Permissão de Localização (opcional)                        │
│         ↓                                                      │
│  7. Permissão de Notificações (opcional)                       │
│         ↓                                                      │
│  8. Home personalizada                                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 Jornada: Relato Urbano via Chat

```
┌────────────────────────────────────────────────────────────────┐
│                    RELATO URBANO                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  CIDADÃO                         SISTEMA                       │
│  ────────                        ───────                       │
│                                                                │
│  Abre app                                                      │
│         ──────────────────────►  Exibe Home                    │
│                                                                │
│  Clica "Relatar Problema"                                      │
│         ──────────────────────►  Abre chat                     │
│                                                                │
│  "Tem um buraco enorme          "Entendo! Pode me dizer        │
│   na rua Augusta"               onde exatamente?"              │
│         ◄──────────────────────                                │
│                                                                │
│  "Perto do 500, esquina                                        │
│   com a Paulista"               "Qual o tamanho                │
│         ──────────────────────►  aproximado?"                  │
│                                                                │
│  "Grande, uns 2 metros"         "Consegue tirar foto?"         │
│         ◄──────────────────────                                │
│                                                                │
│  [Envia foto]                   Classifica categoria           │
│         ──────────────────────►  Calcula severidade            │
│                                  Gera protocolo                │
│                                                                │
│                                  "Registrado! Protocolo:       │
│         ◄──────────────────────  2025-URB-12345"               │
│                                                                │
│  [Recebe notificação            Processa via workflow          │
│   quando status mudar]          Encaminha para comissão        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 5.3 Jornada: Avaliação de Serviço

```
┌────────────────────────────────────────────────────────────────┐
│                 AVALIAÇÃO DE SERVIÇO                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  GATILHO: Usuário próximo de UBS/Escola por > 15 minutos       │
│         OU                                                     │
│  GATILHO: Usuário abre app e sistema pergunta proativamente    │
│                                                                │
│  SISTEMA                         CIDADÃO                       │
│  ───────                         ────────                      │
│                                                                │
│  "Você esteve na UBS             "Sim, fui ontem"              │
│   Jardim São Paulo.                                            │
│   Quer avaliar?"                                               │
│         ──────────────────────►                                │
│                                                                │
│  "Como foi sua experiência?      ⭐⭐⭐ (3 estrelas)             │
│   (1-5 estrelas)"                                              │
│         ◄──────────────────────                                │
│                                                                │
│  "O que poderia melhorar?"       "Esperei 2 horas              │
│                                   pra ser atendido"            │
│         ──────────────────────►                                │
│                                                                │
│  Analisa sentimento (Negativo)                                 │
│  Categoriza: Tempo de espera                                   │
│                                                                │
│  "Deseja encaminhar para         "Sim, quero"                  │
│   a Comissão de Saúde?"                                        │
│         ◄──────────────────────                                │
│                                                                │
│  Registra avaliação              [Recebe confirmação]          │
│  Cria encaminhamento                                           │
│  Atualiza média do serviço                                     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 5.4 Jornada: Gestor - Triagem de Manifestações

```
┌────────────────────────────────────────────────────────────────┐
│              TRIAGEM DE MANIFESTAÇÕES (GESTOR)                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. Acessa CMS Administrativo                                  │
│         ↓                                                      │
│  2. Visualiza Dashboard com KPIs                               │
│         ↓                                                      │
│  3. Identifica pico de relatos na Zona Sul                     │
│         ↓                                                      │
│  4. Aplica filtro: Região=Zona Sul, Período=Última semana      │
│         ↓                                                      │
│  5. Visualiza Kanban: 15 novos, 8 em análise, 5 resolvidos     │
│         ↓                                                      │
│  6. Abre relato prioritário (sentimento negativo, alta sev.)   │
│         ↓                                                      │
│  7. Verifica sugestão de encaminhamento (Comissão de Saúde)    │
│         ↓                                                      │
│  8. Confirma encaminhamento                                    │
│         ↓                                                      │
│  9. Sistema notifica cidadão                                   │
│         ↓                                                      │
│  10. Sistema registra log de auditoria                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. Regras de Negócio

### 6.1 Regras Gerais

| ID | Regra | Descrição |
|----|-------|-----------|
| RN-G01 | Atualização de dados legislativos | Dados da Câmara devem ser sincronizados a cada 15 minutos |
| RN-G02 | Fontes oficiais | IA deve sempre citar fontes oficiais ao fornecer informações |
| RN-G03 | Tempo de resposta | Primeiro token da IA deve aparecer em até 5 segundos |
| RN-G04 | Idioma | Todas as interações em português brasileiro |
| RN-G05 | Janela de notificações | Notificações apenas entre 8h e 20h |
| RN-G06 | Limite de exportação | Exportações limitadas a 10.000 registros por vez |
| RN-G07 | Cache de conteúdo | Conteúdos de terceiros devem ser cacheados localmente |

### 6.2 Regras de Encaminhamento

| ID | Regra | Descrição |
|----|-------|-----------|
| RN-E01 | Sugestão de comissão | Sistema sugere comissão baseada na categoria do relato |
| RN-E02 | Sugestão de vereador | Sistema sugere vereador baseado em região e histórico |
| RN-E03 | Score mínimo | Sugestões com score < 60% devem ser marcadas como "baixa confiança" |
| RN-E04 | Encaminhamento manual | Gestor pode alterar encaminhamento sugerido |
| RN-E05 | Notificação de encaminhamento | Cidadão é notificado quando relato é encaminhado |

### 6.3 Regras de IA/Chatbot

| ID | Regra | Descrição |
|----|-------|-----------|
| RN-IA01 | Escopo delimitado | IA não deve responder sobre assuntos fora do escopo da CMSP |
| RN-IA02 | Válvula de escape | Se IA não compreende após 2 tentativas, oferecer atendimento humano |
| RN-IA03 | Confirmação | Dados críticos devem ser confirmados antes de registrar |
| RN-IA04 | Streaming | Respostas longas devem ser exibidas progressivamente |
| RN-IA05 | Contexto | IA deve manter contexto da conversa por até 30 minutos |
| RN-IA06 | Fallback | Se API de IA falhar, exibir mensagem amigável e oferecer retry |

### 6.4 Regras de Dados

| ID | Regra | Descrição |
|----|-------|-----------|
| RN-D01 | Anonimização | Dados demográficos em relatórios devem ser anonimizados |
| RN-D02 | Retenção de relatos | Relatos mantidos por 5 anos após conclusão |
| RN-D03 | Retenção de logs | Logs de auditoria mantidos por 1 ano |
| RN-D04 | Localização temporária | Dados de GPS não armazenados permanentemente |
| RN-D05 | Foto de relato | Fotos armazenadas por 2 anos após conclusão do relato |

### 6.5 Regras de Acesso

| ID | Regra | Descrição |
|----|-------|-----------|
| RN-A01 | Autenticação obrigatória | Criar manifestações requer login |
| RN-A02 | Visualização pública | Mapa de serviços acessível sem login |
| RN-A03 | Perfil administrativo | Acesso ao CMS apenas para roles: gestor, vereador, assessor, admin |
| RN-A04 | Dados próprios | Cidadão visualiza apenas suas próprias manifestações |
| RN-A05 | Vereador regional | Vereador visualiza manifestações de sua base eleitoral |

---

## 7. Integrações Obrigatórias

### 7.1 SP Legis API

| Aspecto | Especificação |
|---------|---------------|
| **Propósito** | Consumir dados oficiais de audiências, vereadores, comissões |
| **Tipo** | REST API |
| **Autenticação** | A definir com CMSP |
| **Dados consumidos** | Audiências públicas, vereadores, comissões, agenda legislativa |
| **Frequência de sync** | A cada 15 minutos |

### 7.2 Provedor de Mapas

| Aspecto | Especificação |
|---------|---------------|
| **Propósito** | Exibição de mapa, geolocalização, rotas |
| **Candidatos** | Google Maps, Mapbox, Here |
| **Funcionalidades** | Mapa interativo, marcadores, rotas, geocoding |
| **Requisitos** | Suporte a iOS e Android nativo |

### 7.3 Provedor de IA (LLM)

| Aspecto | Especificação |
|---------|---------------|
| **Propósito** | Processamento de linguagem natural, classificação, sentimento |
| **Candidatos** | Google Gemini, OpenAI GPT, Anthropic Claude |
| **Funcionalidades** | Chat completion, streaming, function calling |
| **Requisitos** | Suporte a português brasileiro, baixa latência |

### 7.4 Orquestrador de Workflows

| Aspecto | Especificação |
|---------|---------------|
| **Propósito** | Processamento assíncrono, enriquecimento de dados, automações |
| **Plataforma** | N8N (requisito do cliente) |
| **Eventos** | Criação de relatos, avaliações, encaminhamentos |
| **Funcionalidades** | Webhooks, callbacks, transformação de dados |

### 7.5 Push Notifications

| Aspecto | Especificação |
|---------|---------------|
| **Propósito** | Envio de notificações push para dispositivos móveis |
| **Candidatos** | Firebase Cloud Messaging (FCM), OneSignal |
| **Requisitos** | Suporte a iOS e Android, agendamento, segmentação |

### 7.6 Portal CMSP

| Aspecto | Especificação |
|---------|---------------|
| **Propósito** | Redirecionamento para conteúdos institucionais existentes |
| **Tipo** | Deep links / URLs externas |
| **Páginas** | Agenda, Vereadores, Notícias, Institucional |

---

## 8. Restrições e Premissas

### 8.1 Restrições Técnicas

| ID | Restrição | Justificativa |
|----|-----------|---------------|
| REST-01 | Aplicativo nativo (Flutter ou React Native) | Performance e UX superiores a PWA |
| REST-02 | Não utilizar PWA | Limitações de background em iOS |
| REST-03 | Suporte offline básico | Funcionamento em áreas com conectividade limitada |
| REST-04 | N8N como orquestrador | Requisito do cliente (domínio existente) |

### 8.2 Restrições de Negócio

| ID | Restrição | Justificativa |
|----|-----------|---------------|
| REST-05 | Interface conversacional como principal | Requisito do cliente |
| REST-06 | Conformidade LGPD | Obrigação legal |
| REST-07 | Acessibilidade WCAG 2.1 AA | Inclusão digital e requisitos legais |
| REST-08 | Dados demográficos opcionais | Respeito à privacidade do cidadão |

### 8.3 Premissas

| ID | Premissa | Impacto se Falsa |
|----|----------|------------------|
| PREM-01 | SP Legis API estará disponível e documentada | Atraso na integração de dados legislativos |
| PREM-02 | Orçamento para provedor de IA aprovado | Chatbot limitado ou inexistente |
| PREM-03 | Instância N8N gerenciada pela CMSP | Necessidade de infraestrutura adicional |
| PREM-04 | Equipe de moderação disponível | Acúmulo de manifestações não triadas |

### 8.4 Dependências

| Dependência | Responsável | Prazo Esperado |
|-------------|-------------|----------------|
| Documentação SP Legis API | CMSP | Início do projeto |
| Definição de comissões e categorias | CMSP | Fase de design |
| Provisionamento N8N | CMSP | Antes da fase de integração |
| Base de equipamentos públicos | CMSP | Antes do módulo de mapa |

---

## 9. Critérios de Aceitação

### 9.1 Critérios Funcionais

| Módulo | Critério de Aceite |
|--------|-------------------|
| Acolhimento | Home exibe saudação correta por horário em 100% dos casos |
| Chat IA | 90% das intenções classificadas corretamente em testes |
| Relato Urbano | Protocolo gerado em 100% dos relatos completos |
| Avaliação | Sentimento classificado corretamente em 85% dos casos |
| Mapa | Equipamentos exibidos em ≤ 3 segundos após permissão de localização |
| Notificações | Entrega de push em ≤ 1 minuto após disparo |
| Dashboard | KPIs atualizados em tempo real (≤ 30 segundos de delay) |

### 9.2 Critérios Não Funcionais

| Categoria | Critério de Aceite |
|-----------|-------------------|
| Performance | 95% das requisições com latência ≤ 2s |
| Disponibilidade | Uptime ≥ 99.5% em 30 dias consecutivos |
| Segurança | Zero vulnerabilidades críticas em pentest |
| Acessibilidade | Aprovação em auditoria WCAG 2.1 AA |
| LGPD | Aprovação em auditoria de conformidade |

### 9.3 Critérios de Qualidade de Código

| Critério | Métrica |
|----------|---------|
| Cobertura de testes | ≥ 80% do código coberto |
| Código duplicado | ≤ 3% de duplicação |
| Complexidade ciclomática | ≤ 15 por método |
| Documentação | 100% das APIs documentadas |

---

## 10. Glossário

| Termo | Definição |
|-------|-----------|
| **Audiência Pública** | Reunião aberta para discussão de temas de interesse público na Câmara Municipal |
| **Comissão** | Grupo temático de vereadores responsável por determinada área (Saúde, Transporte, etc.) |
| **Encaminhamento** | Ação de direcionar uma manifestação cidadã para análise de comissão ou vereador |
| **Equipamento Público** | Instalação física de serviço público (UBS, escola, CEU, etc.) |
| **LLM** | Large Language Model - modelo de IA para processamento de linguagem |
| **Manifestação** | Qualquer relato, reclamação, sugestão ou avaliação feita pelo cidadão |
| **N8N** | Plataforma de automação de workflows utilizada pela CMSP |
| **RAG** | Retrieval-Augmented Generation - técnica de IA que combina busca e geração |
| **RLS** | Row Level Security - controle de acesso em nível de linha no banco de dados |
| **Sentimento** | Classificação emocional de um texto (positivo, neutro, negativo) |
| **SP Legis** | Sistema legislativo oficial da Câmara Municipal de São Paulo |
| **Sub-agente** | Módulo especializado de IA para domínio específico (transporte, saúde, etc.) |

---

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
|--------|------|-------|-----------|
| 1.0 | Dez/2025 | Equipe CMSP Connect | Versão inicial - Documento agnóstico de tecnologia |

---

**Fim do Documento**
