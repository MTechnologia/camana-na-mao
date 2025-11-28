# ORDEM DE SERVIÇO

## CMSP Connect - Aplicativo de Participação Cidadã com Inteligência Artificial

---

## 1. IDENTIFICAÇÃO DO PROJETO

**Nome do Projeto:** CMSP Connect

**Objeto:** Desenvolvimento de aplicativo móvel de participação cidadã que utiliza inteligência artificial para conectar munícipes, vereadores e serviços públicos da cidade de São Paulo.

**Contratante:** Câmara Municipal de São Paulo

**Período de Execução:** Dezembro de 2025 a Setembro de 2026 (10 meses)

**Contexto:** Este projeto teve início em Outubro de 2025 com uma etapa de diagnóstico, seguida por uma etapa de arquitetura da informação e prototipação em Novembro de 2025. O presente documento descreve o escopo de execução para os 10 meses subsequentes.

---

## 2. JUSTIFICATIVA

A Câmara Municipal de São Paulo busca fortalecer o vínculo entre o Legislativo e a população paulistana, promovendo maior transparência, participação cidadã e eficiência no atendimento às demandas da sociedade.

O CMSP Connect surge como resposta a esta necessidade, oferecendo um canal digital moderno e acessível que:

- **Democratiza o acesso à informação legislativa**, permitindo que qualquer cidadão acompanhe as atividades da Câmara de forma simples e intuitiva;

- **Facilita a participação em audiências públicas**, ampliando o engajamento da população nos processos decisórios;

- **Cria um canal direto para relatos e avaliações**, permitindo que os munícipes contribuam ativamente para a melhoria dos serviços públicos;

- **Gera inteligência de dados para gestores**, transformando as demandas da população em informações estruturadas para tomada de decisão;

- **Utiliza inteligência artificial para humanizar o atendimento**, oferecendo uma experiência conversacional que orienta o cidadão de forma personalizada.

O aplicativo representa um avanço significativo na modernização do relacionamento entre o poder público e a sociedade, alinhado aos princípios de governo aberto, transparência e participação social.

---

## 3. DESCRIÇÃO DO ESCOPO

### 3.1 Objetivo Principal

Desenvolver e disponibilizar um aplicativo móvel (PWA - Progressive Web App) que sirva como principal canal de interação entre os munícipes de São Paulo e a Câmara Municipal, utilizando inteligência artificial como elemento central da experiência do usuário.

### 3.2 Públicos-Alvo

| Público | Descrição |
|---------|-----------|
| **Munícipes** | Cidadãos de São Paulo que desejam participar da vida política da cidade, relatar problemas, avaliar serviços públicos e acompanhar as atividades legislativas |
| **Vereadores e Assessores** | Representantes eleitos e suas equipes, que receberão demandas encaminhadas e poderão acompanhar os relatos da população |
| **Gestores da Câmara** | Equipe administrativa responsável por gerenciar o sistema, analisar dados e tomar decisões baseadas nas informações coletadas |

### 3.3 Funcionalidades Principais

O aplicativo será composto por dois ambientes principais:

**Ambiente do Cidadão:**
- Assistente virtual conversacional com inteligência artificial
- Consulta e inscrição em audiências públicas
- Avaliação de serviços públicos (UBS, escolas, CEUs, entre outros)
- Relatos de problemas urbanos e de transporte público
- Mapa interativo de serviços públicos próximos
- Acesso ao conteúdo institucional da Câmara
- Notificações personalizadas

**Ambiente Administrativo:**
- Painel de gestão de relatos e avaliações
- Visualização analítica de dados e demandas
- Gerenciamento de audiências públicas
- Administração de usuários e permissões
- Acompanhamento de encaminhamentos às Comissões
- Exportação de relatórios

### 3.4 Proposta de Sitemap

O diagrama abaixo representa uma proposta de organização das telas e funcionalidades do aplicativo. Esta estrutura é ilustrativa e tem como objetivo facilitar a compreensão do escopo. A implementação final poderá apresentar variações em quantidade e organização de telas, desde que atenda às funcionalidades descritas neste documento.

```
CMSP Connect
│
├── Área Pública (Cidadão)
│   │
│   ├── Splash / Onboarding
│   │   └── Apresentação do app e solicitação de permissões
│   │
│   ├── Autenticação
│   │   ├── Login
│   │   ├── Cadastro
│   │   └── Recuperação de senha
│   │
│   ├── Início (Home)
│   │   ├── Saudação personalizada
│   │   ├── Atalhos para principais funcionalidades
│   │   ├── Próximas audiências
│   │   └── Notícias e atualizações
│   │
│   ├── Assistente Virtual (IA)
│   │   ├── Conversa principal
│   │   ├── Histórico de conversas
│   │   └── Fluxos guiados (relatos, avaliações, dúvidas)
│   │
│   ├── Audiências Públicas
│   │   ├── Lista de audiências
│   │   ├── Detalhes da audiência
│   │   ├── Inscrição para participação
│   │   └── Minhas inscrições
│   │
│   ├── Avaliação de Serviços
│   │   ├── Serviços próximos para avaliar
│   │   ├── Formulário de avaliação
│   │   └── Histórico de avaliações
│   │
│   ├── Relatos
│   │   ├── Novo relato (urbano ou transporte)
│   │   ├── Meus relatos
│   │   └── Acompanhamento de encaminhamentos
│   │
│   ├── Mapa de Serviços
│   │   ├── Visualização do mapa
│   │   ├── Filtros por tipo de serviço
│   │   ├── Detalhes do serviço
│   │   └── Como chegar
│   │
│   ├── Conteúdo Institucional
│   │   ├── Conheça a Câmara
│   │   ├── Vereadores
│   │   ├── Comissões
│   │   ├── Notícias
│   │   └── Agenda
│   │
│   ├── Notificações
│   │   └── Central de notificações
│   │
│   └── Perfil
│       ├── Dados pessoais
│       ├── Endereços
│       ├── Interesses
│       ├── Preferências de notificação
│       └── Configurações de acessibilidade
│
└── Área Administrativa (Gestores)
    │
    ├── Dashboard Principal
    │   ├── Indicadores gerais
    │   ├── Gráficos de tendências
    │   └── Alertas e pendências
    │
    ├── Gestão de Relatos
    │   ├── Relatos urbanos
    │   │   ├── Lista com filtros
    │   │   ├── Detalhes do relato
    │   │   ├── Alteração de status
    │   │   └── Encaminhamento para Comissão
    │   │
    │   └── Relatos de transporte
    │       ├── Lista com filtros
    │       ├── Detalhes do relato
    │       ├── Alteração de status
    │       └── Encaminhamento para Comissão
    │
    ├── Gestão de Avaliações
    │   ├── Avaliações por serviço
    │   ├── Análise de sentimento
    │   └── Encaminhamentos
    │
    ├── Gestão de Audiências
    │   ├── Lista de audiências
    │   ├── Criar/Editar audiência
    │   ├── Inscritos por audiência
    │   └── Envio de notificações
    │
    ├── Encaminhamentos
    │   ├── Lista de encaminhamentos
    │   ├── Status por Comissão
    │   └── Histórico de respostas
    │
    ├── Análises e Relatórios
    │   ├── Relatórios por período
    │   ├── Análise por região
    │   ├── Análise por tema
    │   └── Exportação de dados
    │
    ├── Gestão de Usuários
    │   ├── Lista de usuários
    │   ├── Perfis e permissões
    │   └── Logs de auditoria
    │
    └── Configurações
        ├── Parâmetros do sistema
        ├── Notificações automáticas
        └── Integrações
```

---

## 4. CASOS DE USO

### CSU001 - Acolhimento Digital Personalizado

**Proposta de Valor:** Transformar o primeiro contato do cidadão com o aplicativo em uma experiência acolhedora e orientadora, garantindo que cada usuário compreenda rapidamente como o CMSP Connect pode ajudá-lo e se sinta motivado a participar ativamente da vida política de sua cidade.

**Descrição:** Ao acessar o aplicativo pela primeira vez, o cidadão é recebido por um assistente virtual que se apresenta, explica as funcionalidades disponíveis e oferece orientação personalizada. O sistema identifica o contexto do usuário (localização, interesses declarados) para oferecer informações relevantes, como audiências públicas próximas, serviços disponíveis na região e temas legislativos de interesse.

**Funcionalidades:**
- Apresentação inicial do aplicativo e suas capacidades
- Coleta opcional de preferências e interesses do usuário
- Sugestões personalizadas de conteúdo e funcionalidades
- Resumo das atividades legislativas recentes relevantes
- Orientação sobre como utilizar cada recurso do aplicativo

---

### CSU002 - Engajamento em Audiências Públicas

**Proposta de Valor:** Ampliar significativamente a participação popular nas audiências públicas da Câmara, removendo barreiras de informação e facilitando o engajamento de cidadãos que desejam contribuir com os debates legislativos, mas desconhecem como fazê-lo.

**Descrição:** O sistema apresenta as audiências públicas agendadas de forma clara e acessível, permitindo que o cidadão visualize temas, datas, locais e formas de participação. O usuário pode se inscrever para participar, receber lembretes e acessar materiais de apoio. O assistente virtual auxilia na compreensão dos temas em discussão, utilizando linguagem simples.

**Funcionalidades:**
- Listagem de audiências públicas com filtros por tema, data e região
- Detalhamento de cada audiência (pauta, participantes, documentos)
- Inscrição para participação presencial ou remota
- Notificações e lembretes automáticos
- Explicação simplificada dos temas em discussão pelo assistente virtual
- Acesso a documentos e materiais de referência

---

### CSU003 - Acesso ao Conteúdo Institucional

**Proposta de Valor:** Aproximar o cidadão do Poder Legislativo municipal, oferecendo acesso fácil e compreensível às informações institucionais da Câmara, desmistificando o funcionamento do parlamento e promovendo a educação cívica.

**Descrição:** O aplicativo oferece uma seção dedicada ao conteúdo institucional, com informações sobre a Câmara Municipal, seus vereadores, comissões, agenda de atividades e notícias. O assistente virtual está disponível para esclarecer dúvidas sobre o funcionamento do Legislativo, explicar termos técnicos e orientar o cidadão sobre como acompanhar temas de seu interesse.

**Funcionalidades:**
- Apresentação da estrutura e funcionamento da Câmara
- Perfil dos vereadores com áreas de atuação
- Informações sobre as Comissões e suas atribuições
- Agenda de atividades legislativas
- Notícias e comunicados oficiais
- Esclarecimento de dúvidas pelo assistente virtual

---

### CSU004 - Avaliação de Serviços Públicos

**Proposta de Valor:** Empoderar o cidadão como agente ativo na melhoria dos serviços públicos, criando um canal estruturado para que suas experiências sejam registradas, analisadas e direcionadas às instâncias competentes, gerando impacto real na qualidade do atendimento à população.

**Descrição:** O sistema permite que o cidadão avalie serviços públicos que utilizou, como UBS, escolas, CEUs e outros equipamentos municipais. A avaliação pode ser realizada através de conversa com o assistente virtual ou por formulário estruturado. O sistema utiliza a localização do usuário para identificar serviços próximos e sugerir avaliações. As avaliações são analisadas e podem ser encaminhadas às Comissões pertinentes da Câmara.

**Funcionalidades:**
- Identificação de serviços públicos próximos ao usuário
- Avaliação por estrelas e comentário textual
- Coleta de avaliação via conversa com assistente virtual
- Histórico de avaliações realizadas
- Acompanhamento de encaminhamentos gerados
- Análise agregada das avaliações por serviço (área administrativa)

---

### CSU005 - Diagnóstico de Transporte Público

**Proposta de Valor:** Dar voz ao usuário do transporte público paulistano, permitindo que problemas recorrentes sejam documentados, identificados e encaminhados de forma estruturada, contribuindo para a fiscalização e melhoria do sistema de mobilidade urbana.

**Descrição:** O cidadão pode relatar problemas relacionados ao transporte público (ônibus, metrô, trem, corredores) através de conversa com o assistente virtual ou formulário dedicado. O sistema coleta informações sobre a linha, tipo de problema, horário e local da ocorrência. Os relatos são categorizados e podem ser encaminhados às Comissões competentes. A área administrativa permite visualizar padrões e tendências nos relatos.

**Funcionalidades:**
- Registro de relatos sobre transporte público
- Categorização por tipo de problema (atraso, lotação, condições do veículo, acessibilidade, segurança)
- Identificação de linhas e trajetos
- Histórico de relatos do usuário
- Acompanhamento de encaminhamentos
- Identificação de padrões e recorrências (área administrativa)

---

### CSU006 - Painel de Análise de Demandas

**Proposta de Valor:** Transformar o volume de interações dos cidadãos em inteligência estratégica para a Câmara Municipal, permitindo que gestores identifiquem tendências, priorizem ações e tomem decisões baseadas em dados reais da população.

**Descrição:** A área administrativa conta com um painel analítico que consolida as informações coletadas pelo aplicativo. Gestores podem visualizar indicadores sobre relatos, avaliações, participação em audiências e engajamento geral. O painel oferece visualizações por período, região, tema e status, permitindo análises comparativas e identificação de padrões.

**Funcionalidades:**
- Dashboard com indicadores principais
- Gráficos de evolução temporal
- Análise por região geográfica
- Análise por categoria e tema
- Filtros e segmentações diversas
- Exportação de relatórios em formatos padrão
- Alertas sobre variações significativas

---

### CSU007 - Mapa de Serviços Públicos

**Proposta de Valor:** Facilitar o acesso do cidadão aos serviços públicos disponíveis em sua região, reduzindo barreiras de informação e orientando sobre localização, funcionamento e como chegar aos equipamentos municipais.

**Descrição:** O aplicativo oferece um mapa interativo que exibe os serviços públicos próximos à localização do usuário. O cidadão pode filtrar por tipo de serviço (saúde, educação, cultura, esporte), visualizar detalhes de cada equipamento e obter orientações de como chegar. O sistema utiliza dados de geolocalização mediante autorização do usuário.

**Funcionalidades:**
- Mapa interativo com serviços públicos
- Filtros por tipo de serviço
- Detalhes do equipamento (endereço, telefone, horários)
- Avaliações de outros usuários
- Orientações de trajeto
- Busca por nome ou endereço

---

### CSU008 - Relatos Urbanos via Assistente

**Proposta de Valor:** Simplificar o processo de relato de problemas urbanos, permitindo que o cidadão descreva situações de forma natural e conversacional, sem necessidade de preencher formulários complexos, garantindo que sua contribuição chegue às instâncias adequadas da Câmara.

**Descrição:** O cidadão pode relatar problemas urbanos (iluminação, calçadas, limpeza, entre outros) através de conversa com o assistente virtual. O sistema conduz um diálogo natural para coletar as informações necessárias (descrição do problema, localização, fotos opcionais) e categoriza automaticamente o relato. Os relatos são encaminhados às Comissões pertinentes e o cidadão pode acompanhar o andamento.

**Funcionalidades:**
- Coleta de relatos via conversa natural com assistente virtual
- Opção de formulário estruturado como alternativa
- Captura de localização e fotos
- Categorização automática do problema
- Confirmação e protocolo do relato
- Histórico e acompanhamento de relatos
- Encaminhamento às Comissões competentes

---

## 5. ÁREA ADMINISTRATIVA

O sistema contará com uma área administrativa completa, destinada aos gestores da Câmara Municipal. Este ambiente permitirá o gerenciamento de todas as informações coletadas pelo aplicativo, bem como a administração de conteúdos e usuários.

### 5.1 Gestão de Relatos

- Visualização de todos os relatos urbanos e de transporte
- Filtros por categoria, região, período e status
- Alteração de status dos relatos (recebido, em análise, encaminhado, concluído)
- Encaminhamento para Comissões da Câmara
- Registro de respostas e providências
- Visualização de histórico completo de cada relato

### 5.2 Gestão de Avaliações

- Consolidação das avaliações de serviços públicos
- Análise por equipamento, região e período
- Identificação de serviços com avaliações críticas
- Encaminhamento de situações relevantes às Comissões
- Exportação de relatórios de avaliação

### 5.3 Gestão de Audiências Públicas

- Cadastro e edição de audiências públicas
- Gerenciamento de inscrições
- Envio de notificações aos inscritos
- Upload de documentos e materiais de apoio
- Relatório de participação

### 5.4 Gestão de Encaminhamentos

- Acompanhamento de todos os encaminhamentos às Comissões
- Controle de status e prazos
- Registro de respostas das Comissões
- Notificação automática aos cidadãos sobre atualizações
- Relatório de encaminhamentos por Comissão

### 5.5 Análises e Relatórios

- Painéis analíticos com indicadores consolidados
- Relatórios por período, região e tema
- Exportação em formatos padrão (CSV, PDF)
- Gráficos de tendências e comparativos
- Métricas de engajamento e participação

### 5.6 Gestão de Usuários

- Cadastro de usuários administrativos
- Definição de perfis e permissões
- Logs de auditoria das ações realizadas
- Gerenciamento de acessos

### 5.7 Configurações

- Parâmetros gerais do sistema
- Configuração de notificações automáticas
- Gerenciamento de categorias e classificações
- Configuração de integrações externas

---

## 6. REQUISITOS NÃO FUNCIONAIS

### 6.1 Segurança da Informação

- Criptografia de dados em trânsito e em repouso
- Autenticação segura de usuários
- Controle de acesso baseado em perfis
- Proteção contra vulnerabilidades comuns (OWASP Top 10)
- Logs de auditoria para rastreabilidade de ações
- Backup regular dos dados

### 6.2 Conformidade com a LGPD

- Coleta de dados mediante consentimento expresso
- Possibilidade de exclusão de dados pessoais pelo usuário
- Anonimização de dados para análises agregadas
- Transparência sobre uso e tratamento de dados
- Retenção de dados apenas pelo período necessário
- Canal para exercício de direitos do titular

### 6.3 Acessibilidade

- Conformidade com diretrizes WCAG 2.1 nível AA
- Compatibilidade com leitores de tela
- Ajuste de tamanho de fonte
- Contraste adequado de cores
- Navegação por teclado
- Textos alternativos para imagens
- Linguagem clara e objetiva

### 6.4 Usabilidade

- Interface intuitiva e de fácil aprendizado
- Design responsivo para diferentes dispositivos
- Fluxos de navegação simplificados
- Feedback claro das ações realizadas
- Mensagens de erro orientativas
- Ajuda contextual disponível
- Tempo de aprendizado reduzido

### 6.5 Performance

- Tempo de carregamento inicial inferior a 3 segundos
- Resposta do assistente virtual em tempo adequado
- Funcionamento em conexões de baixa velocidade
- Otimização de consumo de dados móveis
- Cache de conteúdos para acesso offline parcial

### 6.6 Disponibilidade

- Disponibilidade mínima de 99% em horário comercial
- Plano de contingência para indisponibilidades
- Monitoramento proativo do sistema
- Procedimentos de recuperação documentados

---

## 7. ETAPAS DA PRESTAÇÃO DE SERVIÇOS

### Etapa 1: Fundação e Autenticação
Desenvolvimento da estrutura base do aplicativo, incluindo sistema de autenticação, perfil de usuário e infraestrutura de dados.

### Etapa 2: Assistente Virtual
Implementação do assistente conversacional com inteligência artificial, incluindo fluxos de orientação, esclarecimento de dúvidas e coleta de informações.

### Etapa 3: Módulo de Audiências Públicas
Desenvolvimento das funcionalidades de listagem, detalhamento, inscrição e notificações relacionadas às audiências públicas.

### Etapa 4: Módulo de Avaliação de Serviços
Implementação do sistema de avaliação de serviços públicos, incluindo identificação por geolocalização e histórico de avaliações.

### Etapa 5: Módulo de Relatos
Desenvolvimento das funcionalidades de relatos urbanos e de transporte, incluindo coleta via assistente virtual e acompanhamento.

### Etapa 6: Mapa de Serviços
Implementação do mapa interativo com serviços públicos, filtros e orientações de trajeto.

### Etapa 7: Conteúdo Institucional
Integração com conteúdos institucionais da Câmara e implementação das seções informativas.

### Etapa 8: Área Administrativa
Desenvolvimento do painel administrativo completo, incluindo gestão de relatos, avaliações, audiências, usuários e configurações.

### Etapa 9: Análises e Relatórios
Implementação dos painéis analíticos, dashboards e funcionalidades de exportação de dados.

### Etapa 10: Testes e Ajustes
Execução de testes de qualidade, segurança, acessibilidade e performance, com correção de problemas identificados.

### Etapa 11: Publicação
Disponibilização do aplicativo para o público, incluindo configuração de ambiente de produção e monitoramento.

### Etapa 12: Documentação e Treinamento
Elaboração de documentação técnica e de usuário, realização de treinamentos para a equipe da Câmara.

### Etapa 13: Acompanhamento Pós-Publicação
Período de suporte, monitoramento, ajustes finos e estabilização do sistema após a publicação.

---

## 8. CRONOGRAMA DE EXECUÇÃO

| Mês | Período | Entregas Previstas | Percentual |
|-----|---------|-------------------|------------|
| 1 | Dezembro/2025 | Fundação do aplicativo, sistema de autenticação, estrutura de perfil de usuário | 10% |
| 2 | Janeiro/2026 | Assistente virtual conversacional, fluxos de orientação e ajuda | 10% |
| 3 | Fevereiro/2026 | Módulo de audiências públicas, sistema de inscrições e notificações | 10% |
| 4 | Março/2026 | Módulo de avaliação de serviços, geolocalização, histórico de avaliações | 10% |
| 5 | Abril/2026 | Módulo de relatos urbanos e de transporte, encaminhamentos | 10% |
| 6 | Maio/2026 | Mapa de serviços públicos, conteúdo institucional | 10% |
| 7 | Junho/2026 | Área administrativa: gestão de relatos, avaliações e audiências | 10% |
| 8 | Julho/2026 | Área administrativa: análises, relatórios, gestão de usuários | 10% |
| 9 | Agosto/2026 | Testes de qualidade, segurança e acessibilidade, ajustes e publicação | 10% |
| 10 | Setembro/2026 | Documentação, treinamento e acompanhamento pós-publicação | 10% |

---

## 9. PRODUTO FINAL

Ao término do projeto, serão entregues:

### 9.1 Aplicativo CMSP Connect
Aplicativo móvel (PWA) completo e funcional, contemplando todas as funcionalidades descritas neste documento, publicado e disponível para acesso pelos cidadãos de São Paulo.

### 9.2 Área Administrativa
Painel de gestão completo para a equipe da Câmara Municipal, permitindo gerenciamento de todas as informações e funcionalidades do sistema.

### 9.3 Documentação Técnica
Documentação completa do sistema, incluindo arquitetura, fluxos, integrações e procedimentos de manutenção.

### 9.4 Manual do Usuário
Guia de utilização do aplicativo para cidadãos e manual de operação da área administrativa para gestores.

### 9.5 Treinamento
Capacitação da equipe da Câmara Municipal para operação e gestão do sistema.

---

## 10. CRITÉRIOS DE ACEITAÇÃO

O projeto será considerado concluído mediante:

- Disponibilização do aplicativo em ambiente de produção acessível ao público
- Funcionamento de todas as funcionalidades descritas nos casos de uso
- Área administrativa operacional e acessível aos gestores designados
- Atendimento aos requisitos de segurança, LGPD e acessibilidade
- Entrega da documentação técnica e manuais de usuário
- Realização dos treinamentos para a equipe da Câmara
- Período de estabilização sem falhas críticas

---

## 11. VIGÊNCIA

Este documento descreve os serviços a serem executados no período de **Dezembro de 2025 a Setembro de 2026**, totalizando 10 meses de execução.

O projeto completo compreende 12 meses, considerando:
- **Outubro/2025:** Diagnóstico e levantamento de requisitos
- **Novembro/2025:** Arquitetura da informação e prototipação
- **Dezembro/2025 a Setembro/2026:** Desenvolvimento, testes, publicação e treinamento

---

*Documento elaborado para fins de aprovação e execução do projeto CMSP Connect.*
